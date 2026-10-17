"""Build small, source-labelled JSON summaries of the challenge datasets for the Ellie dashboards.

Usage: python3 scripts/build_datasets.py <dataset_dir>
<dataset_dir> holds fatigue_study_daily.csv, lifesnaps_daily.csv, lifesnaps_hourly.csv,
nhanes_us_adults.csv and the unzipped Challenge5_Coaches_Copilot folder as c5/.
Each output file covers one source; rows from different sources are never joined.
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "datasets")
OUT = Path(__file__).resolve().parent.parent / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def r(x, d=1):
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    return round(float(x), d)


def write(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=1, allow_nan=False))
    print(f"wrote {name}")


# ---------- Challenge 1: Rao et al. fatigue study (real) ----------
f = pd.read_csv(SRC / "fatigue_study_daily.csv")
F_METRICS = ["steps", "sleep_minutes", "resting_heart_rate", "sleep_efficiency_pct", "minutes_brisk_activity"]
wearers = f.groupby("person_id")["minutes_fitbit_worn"].transform(lambda s: s.notna().any())
fw = f[wearers]
rated = f[f.day_rating.notna()]

by_rating = []
for rating in ["good", "average", "bad"]:
    sub = fw[fw.day_rating == rating]
    by_rating.append({"rating": rating, "days": int(len(sub)),
                      **{m: r(sub[m].mean()) for m in F_METRICS}})

# Within-person: how far a day sits from that person's own average, bad days vs good days.
within = []
for m in F_METRICS:
    d = fw[["person_id", "day_rating", m]].dropna()
    d = d.assign(dev=d[m] - d.groupby("person_id")[m].transform("mean"),
                 pct=lambda x: 100 * (x[m] - x.groupby("person_id")[m].transform("mean"))
                 / x.groupby("person_id")[m].transform("mean"))
    has_both = d.groupby("person_id").day_rating.agg(lambda s: (s == "bad").any() and (s == "good").any())
    d = d[d.person_id.isin(has_both[has_both].index)]
    within.append({"metric": m, "people": int(d.person_id.nunique()),
                   "bad_day_vs_own_average": r(d[d.day_rating == "bad"].dev.mean()),
                   "good_day_vs_own_average": r(d[d.day_rating == "good"].dev.mean()),
                   "bad_day_pct_vs_own_average": r(d[d.day_rating == "bad"].pct.mean()),
                   "good_day_pct_vs_own_average": r(d[d.day_rating == "good"].pct.mean())})

groups = []
for g, sub in rated.groupby("health_group"):
    groups.append({"group": g, "people": int(sub.person_id.nunique()), "rated_days": int(len(sub)),
                   "bad_day_pct": r(100 * (sub.day_rating == "bad").mean())})

write("c1_fatigue_study.json", {
    "source": "Rao C, et al. Association of digital measures and self-reported fatigue. Frontiers in Digital Health, 2023.",
    "kind": "real", "label": "Real research data (not Ellie patients)",
    "population": "296 US adults followed about a month in 2020; about half live with lupus or Sjögren's. Not a cancer cohort.",
    "people": int(f.person_id.nunique()), "days": int(len(f)),
    "people_with_fitbit": int(fw.person_id.nunique()),
    "days_without_rating_pct": r(100 * f.day_rating.isna().mean()),
    "wearer_days_without_steps_pct": r(100 * fw.steps.isna().mean()),
    "day_ratings": {k: int(v) for k, v in f.day_rating.value_counts().items()},
    "by_day_rating": by_rating,
    "within_person": within,
    "by_health_group": groups,
    "caveat": "Observational averages. Blank days are left out, not counted as zero. Bad days are self-rated.",
})

# ---------- Challenge 1: LifeSnaps (real) ----------
ld = pd.read_csv(SRC / "lifesnaps_daily.csv")
lh = pd.read_csv(SRC / "lifesnaps_hourly.csv")
L_METRICS = ["steps", "sleep_minutes", "resting_heart_rate", "hrv_rmssd_ms", "sleep_efficiency_pct"]
variation = []
for m in L_METRICS:
    d = ld[["person_id", m]].dropna()
    n = d.groupby("person_id")[m].count()
    d = d[d.person_id.isin(n[n >= 14].index)]
    stats = d.groupby("person_id")[m].agg(["mean", "std"])
    variation.append({"metric": m, "people": int(len(stats)),
                      "typical_personal_average": r(stats["mean"].median()),
                      "typical_day_to_day_sd": r(stats["std"].median()),
                      "typical_cv_pct": r(100 * (stats["std"] / stats["mean"]).median())})
SENSORS = ["steps", "resting_heart_rate", "sleep_minutes", "hrv_rmssd_ms", "blood_oxygen_spo2_pct",
           "fitbit_stress_score_0_to_100", "skin_temp_change_c", "any_mood_reported"]
completeness = [{"field": c, "days_present_pct": r(100 * (ld[c].notna() if c != "any_mood_reported" else ld[c] == 1).mean())}
                for c in SENSORS]
hourly = lh.groupby("hour").agg(steps=("steps", "mean"), avg_heart_rate=("avg_heart_rate", "mean")).reset_index()
mood = ld[ld.any_mood_reported == 1]
tired = []
for flag in [1, 0]:
    sub = mood[mood.felt_tired == flag]
    tired.append({"felt_tired": bool(flag), "days": int(len(sub)), "steps": r(sub.steps.mean(), 0),
                  "sleep_minutes": r(sub.sleep_minutes.mean()), "resting_heart_rate": r(sub.resting_heart_rate.mean())})
write("c1_lifesnaps.json", {
    "source": "Yfantidou S, et al. LifeSnaps, a 4-month multi-modal dataset. Scientific Data, 2022. CC BY 4.0.",
    "kind": "real", "label": "Real research data (not Ellie patients)",
    "population": "71 adults wearing a Fitbit for about 4 months. Not a cancer cohort.",
    "people": int(ld.person_id.nunique()), "days": int(len(ld)), "hourly_rows": int(len(lh)),
    "day_to_day_variation": variation,
    "sensor_completeness": completeness,
    "hourly_profile": [{"hour": int(h.hour), "steps": r(h.steps, 0), "avg_heart_rate": r(h.avg_heart_rate)} for h in hourly.itertuples()],
    "mood_checkin_days": tired,
    "caveat": "Personal variation uses people with at least 14 days of that measure. Blank sensor days are left out.",
})

# ---------- Challenge 2: NHANES 2011-2014 (real) ----------
nh = pd.read_csv(SRC / "nhanes_us_adults.csv")
nh = nh[nh.cancer_survivor.isin(["yes", "no"])]
nh = nh.assign(prediabetes_or_more=np.where(nh.hba1c_pct.notna(), (nh.hba1c_pct >= 5.7).astype(float), np.nan),
               diabetes_yes=np.where(nh.diabetes_diagnosed.notna(), (nh.diabetes_diagnosed == "yes").astype(float), np.nan))
N_METRICS = [  # (column, weight, label, unit)
    ("movement_per_day_mims", "survey_weight_exam", "Daily movement (wrist sensor)", "MIMS/day"),
    ("sensor_sleep_hours_per_day", "survey_weight_exam", "Sleep (wrist sensor)", "h/day"),
    ("bmi", "survey_weight_exam", "BMI", "kg/m²"),
    ("hba1c_pct", "survey_weight_exam", "HbA1c", "%"),
    ("prediabetes_or_more", "survey_weight_exam", "HbA1c 5.7% or higher", "share"),
    ("diabetes_yes", "survey_weight_exam", "Diagnosed diabetes", "share"),
    ("fasting_glucose_mg_dl", "survey_weight_fasting_lab", "Fasting glucose", "mg/dL"),
    ("overnight_fast_hours_avg", "survey_weight_diet_2day", "Overnight fast", "h"),
    ("last_eating_hour_avg", "survey_weight_diet_2day", "Last eating hour", "hour of day"),
    ("fiber_g", "survey_weight_diet_2day", "Fiber", "g/day"),
]


def wmean(d, col, w):
    d = d[[col, w]].dropna()
    d = d[d[w] > 0]
    return (np.average(d[col], weights=d[w]) if len(d) else np.nan), int(len(d))


def compare(frame):
    rows = []
    for col, w, label, unit in N_METRICS:
        row = {"metric": col, "label": label, "unit": unit, "weight": w}
        for grp in ["yes", "no"]:
            v, n = wmean(frame[frame.cancer_survivor == grp], col, w)
            key = "survivors" if grp == "yes" else "no_cancer"
            row[key] = r(100 * v if unit == "share" else v, 2)
            row[key + "_n"] = n
        if unit == "share":
            row["unit"] = "%"
        rows.append(row)
    return rows


def tertiles(frame, by, by_w, outcome, out_w):
    d = frame[list(dict.fromkeys([by, by_w, outcome, out_w]))].dropna()
    d = d[(d[by_w] > 0) & (d[out_w] > 0)]
    d = d.assign(t=pd.qcut(d[by], 3, labels=["lowest third", "middle third", "highest third"]))
    return [{"group": str(t), "n": int(len(s)), "range": [r(s[by].min()), r(s[by].max())],
             outcome: r(np.average(s[outcome], weights=s[out_w]), 2)} for t, s in d.groupby("t", observed=True)]


types = (nh[nh.cancer_survivor == "yes"].cancer_types.dropna().str.split(r"\s*[;|]\s*").explode().value_counts().head(8))
surv = nh[nh.cancer_survivor == "yes"]
write("c2_nhanes.json", {
    "source": "CDC National Health and Nutrition Examination Survey (NHANES), 2011-2014 cycles.",
    "kind": "real", "label": "Real US survey data (not Ellie patients)",
    "people": int(len(nh)), "survivors": int((nh.cancer_survivor == "yes").sum()),
    "survivor_median_age": r(surv.age.median(), 0), "no_cancer_median_age": r(nh[nh.cancer_survivor == "no"].age.median(), 0),
    "weighting": "Survey-weighted means: exam weight for sensor, body and HbA1c; diet weight for meal timing and fiber; fasting weight for glucose. Two cycles pooled. Point estimates only; no design-based confidence intervals.",
    "all_ages": compare(nh),
    "age_60_plus": compare(nh[nh.age >= 60]),
    "survivor_cancer_types": [{"type": k, "people": int(v)} for k, v in types.items()],
    "survivors_hba1c_by_movement": tertiles(surv, "movement_per_day_mims", "survey_weight_exam", "hba1c_pct", "survey_weight_exam"),
    "all_hba1c_by_movement": tertiles(nh, "movement_per_day_mims", "survey_weight_exam", "hba1c_pct", "survey_weight_exam"),
    "caveat": "Cross-sectional snapshot. Differences are associations, not effects; survivors are older on average.",
})

# ---------- Challenge 5: Coach's Co-pilot ----------
C5 = SRC / "c5"
SY = C5 / "synthetic_data"
mi = pd.read_csv(C5 / "coaching_sessions_annomi.csv")


def annomi_profile(d):
    c = d[d.speaker == "counsellor"]
    q = c.question_type.value_counts()
    rf = c.reflection_type.value_counts()
    ct = d.client_talk.value_counts()
    nq, nr = q.sum(), rf.sum()
    return {"sessions": int(d.session_id.nunique()), "lines": int(len(d)),
            "reflections_per_question": r(nr / nq if nq else np.nan, 2),
            "open_question_pct": r(100 * q.get("open", 0) / nq if nq else np.nan),
            "complex_reflection_pct": r(100 * rf.get("complex", 0) / nr if nr else np.nan),
            "info_or_advice_pct_of_counsellor_lines": r(100 * (c.counsellor_move == "giving information or advice").mean()),
            "change_talk_pct": r(100 * ct.get("change", 0) / (ct.get("change", 0) + ct.get("sustain", 0)))}


bench = mi[mi.expert_raters >= 10]
tx = pd.read_csv(C5 / "text_message_coaching.csv")
calls = pd.read_csv(SY / "synthetic_calls.csv")
lines = pd.read_csv(SY / "synthetic_call_transcripts.csv")
ratings = pd.read_csv(SY / "synthetic_supervisor_ratings.csv")
coaches = pd.read_csv(SY / "synthetic_coaches.csv")
parts = pd.read_csv(SY / "synthetic_participants.csv")
texts = pd.read_csv(SY / "synthetic_text_messages.csv")
goals = pd.read_csv(SY / "synthetic_weekly_goals.csv")

FAMILY = {"affirm", "seek collaboration", "emphasize autonomy", "ask permission"}


def mi_score(cl):
    """Same formula as src/lib/miScore.ts scoreCoaching."""
    coach = cl[(cl.speaker == "coach") & cl.coach_move.notna()].coach_move
    if len(coach) < 4:
        return np.nan
    n = coach.value_counts()
    op, cq = n.get("open question", 0), n.get("closed question", 0)
    si, co = n.get("simple reflection", 0), n.get("complex reflection", 0)
    af = sum(n.get(k, 0) for k in FAMILY)
    na = n.get("persuade", 0) + n.get("confront", 0)
    q, rf = op + cq, si + co
    return round(30 * min((rf / q if q else (2 if rf else 0)) / 2, 1)
                 + 20 * min((co / rf if rf else 0) / 0.4, 1)
                 + 20 * min((op / q if q else 0) / 0.5, 1)
                 + 30 * (af / (af + na) if af + na else 1))


labelled_ids = set(calls[calls.labelled == "yes"].call_id)
ll = lines[lines.call_id.isin(labelled_ids)]
call_scores = ll.groupby("call_id").apply(mi_score, include_groups=False).rename("mi_score").reset_index()
flags = ll[ll.needs_human == "yes"].groupby("call_id").size().rename("needs_human_lines")
rated = ratings.groupby("call_id").agg(overall=("overall_1_to_5", "mean"), empathy=("empathy_1_to_5", "mean"),
                                       partnership=("partnership_1_to_5", "mean")).reset_index()
cs = calls.merge(call_scores, on="call_id", how="left").merge(rated, on="call_id", how="left")

coach_rows = []
for c in coaches.itertuples():
    sub = cs[cs.coach_id == c.coach_id]
    coach_rows.append({"coach_id": c.coach_id, "first_name": c.first_name, "role": c.role, "languages": c.languages,
                       "years_experience": int(c.years_experience), "calls": int(len(sub)),
                       "labelled_calls": int(sub.mi_score.notna().sum()), "mi_score": r(sub.mi_score.mean()),
                       "rated_calls": int(sub.overall.notna().sum()), "supervisor_overall": r(sub.overall.mean(), 2),
                       "supervisor_empathy": r(sub.empathy.mean(), 2)})

wide = ratings.pivot(index="call_id", columns="rater", values="overall_1_to_5").dropna()
a, b = wide.iloc[:, 0], wide.iloc[:, 1]
both = cs.dropna(subset=["mi_score", "overall"])
CHECK = ["set_agenda", "checked_feelings", "reviewed_last_goal", "set_new_goal", "planned_for_barriers", "summarized", "set_next_contact"]
cs["month"] = cs.date.str[:7]
trend = cs.dropna(subset=["mi_score"]).groupby("month").mi_score.agg(["mean", "count"]).reset_index()
lt = texts[texts.labelled == "yes"]
write("c5_coaching.json", {
    "sources": {
        "annomi": "Wu Z, et al. Creation, Analysis and Evaluation of AnnoMI, a Dataset of Expert-Annotated Counselling Dialogues. Future Internet, 2023. Public domain.",
        "text_coaching": "Gupta I, et al. Human-Human Health Coaching via Text Messages: Corpus, Annotation, and Analysis. SIGDIAL 2020.",
        "synthetic": "Synthetic coaching program made by the Crane Lab, Sylvester Comprehensive Cancer Center, for the Miami AI Hackathon. Nobody is real.",
    },
    "annomi": {"kind": "real", "label": "Real expert-labelled demonstration sessions",
               "high_quality": annomi_profile(mi[mi.session_quality == "high"]),
               "low_quality": annomi_profile(mi[mi.session_quality == "low"]),
               "benchmark_lines": int(len(bench)),
               "benchmark_expert_agreement_pct": r(bench.expert_agreement_pct.mean()),
               "topics": [{"topic": k, "sessions": int(v)} for k, v in mi.groupby("topic").session_id.nunique().sort_values(ascending=False).head(8).items()]},
    "text_coaching": {"kind": "real", "label": "Real coach-patient texts (UIC, 2019)",
                      "patients": int(tx.patient_id.nunique()), "messages": int(len(tx)),
                      "by_sender": {k: int(v) for k, v in tx.sender.value_counts().items()},
                      "by_week": [{"week": int(w), "messages": int(n)} for w, n in tx.groupby("week").size().items()],
                      "caveat": "Conversation-step labels came from the researchers' model, not people."},
    "program": {"kind": "synthetic", "label": "Synthetic coaching program (made-up people)",
                "coaches": int(len(coaches)), "participants": int(len(parts)), "calls": int(len(calls)),
                "labelled_calls": int(len(labelled_ids)), "transcript_lines": int(len(lines)), "texts": int(len(texts)),
                "calls_by_language": {k: int(v) for k, v in calls.language.value_counts().items()},
                "participants_by_cancer_type": [{"type": k, "people": int(v)} for k, v in parts.cancer_type.value_counts().head(8).items()],
                "coach_scorecard": coach_rows,
                "mi_score_by_month": [{"month": t.month, "mi_score": r(t.mean), "labelled_calls": int(t.count)} for t in trend.itertuples()],
                "supervisor_agreement": {"calls_rated_by_both": int(len(wide)),
                                         "exact_overall_pct": r(100 * (a == b).mean()),
                                         "within_one_point_pct": r(100 * ((a - b).abs() <= 1).mean())},
                "mi_score_vs_supervisor": {"calls": int(len(both)),
                                           "spearman": r(both.mi_score.corr(both.overall, method="spearman"), 2)},
                "checklist_done_pct": [{"item": c, "pct": r(100 * (ratings[c] == "yes").mean())} for c in CHECK],
                "safety": {"labelled_calls_with_needs_human": int(len(flags)), "needs_human_lines": int(flags.sum()),
                           "labelled_texts": int(len(lt)), "texts_needs_human": int((lt.needs_human == "yes").sum()),
                           "text_intents": {k: int(v) for k, v in lt.intent.value_counts().items()}},
                "goal_met_by_topic": [{"topic": t, "weeks": int(len(s)), "met_pct": r(100 * (s.goal_met == "yes").mean()),
                                       "partly_pct": r(100 * (s.goal_met == "partly").mean())}
                                      for t, s in goals.groupby("topic")],
                "goal_met_by_week": [{"week": int(w), "met_pct": r(100 * (s.goal_met == "yes").mean())} for w, s in goals.groupby("week")],
                "caveat": "MI score uses Ellie's 30/20/20/30 formula on supervisor-labelled calls only (about 1 in 4)."},
})

shutil.copy(SY / "synthetic_300_calls.json", OUT / "c5_program_300_calls.json")
print("copied c5_program_300_calls.json")
