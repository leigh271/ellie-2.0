#!/usr/bin/env python3
import csv
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path


ROSTER = [
    {"id": "maria", "sex": "female", "nhanes": ("cervix",), "cancer": None, "language": "English", "declining_steps": True},
    {"id": "jasmine", "sex": "female", "nhanes": ("breast",), "cancer": "breast", "language": "English"},
    {"id": "ana", "sex": "female", "nhanes": ("lymphoma",), "cancer": "lymphoma", "language": "Spanish"},
    {"id": "david", "sex": "male", "nhanes": ("colon", "rectum"), "cancer": "colorectal", "language": "English"},
    {"id": "priya", "sex": "female", "nhanes": ("ovary",), "cancer": None, "language": "English"},
    {"id": "robert", "sex": "male", "nhanes": ("prostate",), "cancer": "prostate", "language": "English"},
]

NHANES_FIELDS = (
    "person_id", "survey_years", "age", "cancer_types",
    "years_since_first_cancer_diagnosis", "bmi", "waist_cm", "hba1c_pct",
    "fasting_glucose_mg_dl", "movement_per_day_mims",
    "sensor_sleep_hours_per_day", "sleep_hours_self_report",
    "overnight_fast_hours_avg", "last_eating_hour_avg", "fiber_g",
    "calories_per_day", "self_rated_health",
)
WEARABLE_BASELINE_FIELDS = ("steps", "sleep_minutes", "resting_heart_rate")
WEARABLE_SERIES_FIELDS = (
    "steps", "sleep_minutes", "resting_heart_rate", "day_rating",
    "bad_day", "tired_0_to_4",
)
COACHING_CALL_FIELDS = (
    "call_id", "call_number", "program_week", "date",
    "goal_topic", "duration_min", "supervisor_overall",
)
CAVEAT = (
    "Demo linkage: records from different study participants combined into one "
    "fictional profile — not one real person's chart."
)


def read_csv(path):
    with path.open(newline="", encoding="utf-8-sig") as source:
        return list(csv.DictReader(source))


def number(raw_value):
    if raw_value is None:
        return None
    text = str(raw_value).strip()
    if not text or text.lower() in {"nan", "na", "n/a", "null", "none"}:
        return None
    try:
        result = float(text)
    except ValueError:
        return None
    return result if math.isfinite(result) else None


def value(raw_value):
    if raw_value is None:
        return None
    text = str(raw_value).strip()
    if not text or text.lower() in {"nan", "na", "n/a", "null", "none"}:
        return None
    numeric = number(text)
    if numeric is None:
        return text
    return int(numeric) if numeric.is_integer() else numeric


def identifier(raw_value):
    result = value(raw_value)
    return result if result is not None else ""


def id_sort_key(raw_value):
    text = str(raw_value)
    numeric = number(text)
    return (0, numeric) if numeric is not None else (1, text.casefold())


def number_mean(rows, field):
    present = [number(row.get(field)) for row in rows]
    values = [item for item in present if item is not None]
    return sum(values) / len(values) if values else None


def sex_matches(raw_value, expected):
    text = (raw_value or "").strip().lower()
    return text in {expected, expected[0]}


def eligible_nhanes(row, patient):
    if (row.get("cancer_survivor") or "").strip().lower() != "yes":
        return False
    if not sex_matches(row.get("sex"), patient["sex"]):
        return False
    cancer_types = {
        token.strip().casefold()
        for token in re.split(r"[;,|]", row.get("cancer_types") or "")
        if token.strip()
    }
    if not cancer_types.intersection(patient["nhanes"]):
        return False
    return all(number(row.get(field)) is not None for field in (
        "hba1c_pct", "bmi", "movement_per_day_mims",
        "sensor_sleep_hours_per_day",
    ))


def select_nhanes(rows, patient, used):
    eligible = sorted(
        (row for row in rows if eligible_nhanes(row, patient)),
        key=lambda row: id_sort_key(row.get("person_id", "")),
    )
    for row in eligible:
        person_id = identifier(row.get("person_id"))
        if person_id not in used:
            used.add(person_id)
            return {field: value(row.get(field)) for field in NHANES_FIELDS}
    return None


def wearable_candidates(rows, patient, enforce_balance):
    grouped = defaultdict(list)
    for row in rows:
        if sex_matches(row.get("sex"), patient["sex"]):
            grouped[row.get("person_id", "")].append(row)

    candidates = []
    for person_id, person_rows in grouped.items():
        ordered = sorted(person_rows, key=lambda row: row.get("date") or "")
        if len(ordered) < 28:
            continue
        window = ordered[-28:]
        if sum(number(row.get("steps")) is not None for row in window) < 24:
            continue

        baseline_steps = number_mean(window[:14], "steps")
        recent_steps = number_mean(window[14:], "steps")
        if baseline_steps is None or recent_steps is None:
            continue
        if patient.get("declining_steps"):
            recent = window[14:]
            bad_days = sum(number(row.get("bad_day")) == 1 for row in recent)
            if recent_steps > 0.85 * baseline_steps or bad_days < 2:
                continue
        elif enforce_balance and not (
            0.9 * baseline_steps <= recent_steps <= 1.1 * baseline_steps
        ):
            continue
        candidates.append((person_id, window))

    return sorted(candidates, key=lambda item: id_sort_key(item[0]))


def select_wearable(rows, patient, used):
    for enforce_balance in (True, False):
        if not enforce_balance and patient["sex"] != "male":
            break
        for person_id, window in wearable_candidates(rows, patient, enforce_balance):
            normalized_id = identifier(person_id)
            if normalized_id in used:
                continue
            used.add(normalized_id)
            record = {
                "person_id": value(person_id),
                "health_group": value(window[0].get("health_group")),
                "baseline": {
                    field: number_mean(window[:14], field)
                    for field in WEARABLE_BASELINE_FIELDS
                },
                "series": [
                    {"day": day, **{
                        field: value(row.get(field))
                        for field in WEARABLE_SERIES_FIELDS
                    }}
                    for day, row in enumerate(window, start=1)
                ],
            }
            return record, not enforce_balance
    return None, False


def participant_sort_key(participant_id):
    text = str(participant_id)
    match = re.fullmatch(r"([A-Za-z]*)(\d+)", text)
    if match:
        return (0, match.group(1).casefold(), int(match.group(2)))
    return (1, text.casefold(), 0)


def select_coaching(participants, calls, ratings, goals, coaches, patient, used):
    calls_by_participant = defaultdict(list)
    for call in calls:
        calls_by_participant[call.get("participant_id", "")].append(call)

    ratings_by_call = defaultdict(list)
    for rating in ratings:
        overall = number(rating.get("overall_1_to_5"))
        if overall is not None:
            ratings_by_call[rating.get("call_id", "")].append(overall)

    goals_by_participant = defaultdict(list)
    for goal in goals:
        goals_by_participant[goal.get("participant_id", "")].append(goal)

    coaches_by_id = {coach.get("coach_id", ""): coach for coach in coaches}
    eligible = []
    for participant in participants:
        participant_id = participant.get("participant_id", "")
        if not sex_matches(participant.get("sex"), patient["sex"]):
            continue
        if (participant.get("call_language") or "").strip().casefold() != patient["language"].casefold():
            continue
        cancer_type = (participant.get("cancer_type") or "").strip().casefold()
        target = patient["cancer"]
        if target is not None and cancer_type != target.casefold():
            continue
        participant_calls = calls_by_participant.get(participant_id, [])
        if len(participant_calls) < 3:
            continue
        eligible.append((participant_id, participant, participant_calls))

    eligible.sort(key=lambda item: participant_sort_key(item[0]))
    for participant_id, participant, participant_calls in eligible:
        if participant_id in used:
            continue
        used.add(participant_id)
        coach = coaches_by_id.get(participant.get("coach_id", ""), {})
        sorted_calls = sorted(
            participant_calls,
            key=lambda call: (
                number(call.get("call_number")) or 0,
                call.get("call_id", ""),
            ),
        )
        output_calls = []
        for call in sorted_calls:
            call_ratings = ratings_by_call.get(call.get("call_id", ""), [])
            output_calls.append({
                field: (
                    sum(call_ratings) / len(call_ratings)
                    if call_ratings else None
                ) if field == "supervisor_overall" else value(call.get(field))
                for field in COACHING_CALL_FIELDS
            })

        participant_goals = goals_by_participant.get(participant_id, [])
        participant_goals.sort(key=lambda goal: (
            number(goal.get("week")) or 0,
            goal.get("topic") or "",
        ))
        output_goals = [{
            "week": value(goal.get("week")),
            "goal": value(goal.get("goal")),
            "topic": value(goal.get("topic")),
            "goal_met": value(goal.get("goal_met")),
        } for goal in participant_goals]
        met_goals = sum(
            (goal.get("goal_met") or "").strip().lower() == "yes"
            for goal in participant_goals
        )
        return {
            "participant_id": participant_id,
            "cancer_type": value(participant.get("cancer_type")),
            "program_focus": value(participant.get("program_focus")),
            "coach_name": value(coach.get("first_name")),
            "calls": output_calls,
            "weekly_goals": output_goals,
            "goal_met_rate": met_goals / len(participant_goals) if participant_goals else None,
        }
    return None


def require_record(record, source, patient_id):
    if record is None:
        raise ValueError(f"No eligible {source} record for {patient_id}; stopping without writing output.")
    return record


def build(dataset_dir):
    nhanes_rows = read_csv(dataset_dir / "nhanes_us_adults.csv")
    fatigue_rows = read_csv(dataset_dir / "fatigue_study_daily.csv")
    synthetic_dir = dataset_dir / "c5" / "synthetic_data"
    participants = read_csv(synthetic_dir / "synthetic_participants.csv")
    calls = read_csv(synthetic_dir / "synthetic_calls.csv")
    ratings = read_csv(synthetic_dir / "synthetic_supervisor_ratings.csv")
    goals = read_csv(synthetic_dir / "synthetic_weekly_goals.csv")
    coaches = read_csv(synthetic_dir / "synthetic_coaches.csv")

    used_nhanes = set()
    used_wearables = set()
    used_coaching = set()
    patients = {}
    relaxed_patients = []
    for patient in ROSTER:
        nhanes = require_record(
            select_nhanes(nhanes_rows, patient, used_nhanes),
            "NHANES", patient["id"],
        )
        wearable, relaxed = select_wearable(fatigue_rows, patient, used_wearables)
        wearable = require_record(wearable, "fatigue wearable", patient["id"])
        if relaxed:
            relaxed_patients.append(patient["id"])
            print(
                f"Relaxed the 0.9–1.1 recent-step rule for male patient {patient['id']}.",
                file=sys.stderr,
            )
        coaching = require_record(
            select_coaching(
                participants, calls, ratings, goals, coaches, patient, used_coaching,
            ),
            "synthetic coaching", patient["id"],
        )
        patients[patient["id"]] = {
            "wearable": wearable,
            "nhanes": nhanes,
            "coaching": coaching,
        }

    return {
        "about": {
            "caveat": CAVEAT,
            "male_wearable_rule_relaxations": relaxed_patients,
        },
        "patients": patients,
    }


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/build_patient_links.py <dataset-dir>", file=sys.stderr)
        return 2
    dataset_dir = Path(sys.argv[1]).expanduser().resolve()
    if not dataset_dir.is_dir():
        print(f"Dataset directory does not exist: {dataset_dir}", file=sys.stderr)
        return 2
    output_path = Path(__file__).resolve().parents[1] / "public" / "data" / "patient_links.json"
    try:
        result = build(dataset_dir)
    except (OSError, ValueError, KeyError) as error:
        print(str(error), file=sys.stderr)
        return 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {output_path}")
    for patient_id, links in result["patients"].items():
        print(
            f"{patient_id}: wearable={links['wearable']['person_id']}, "
            f"nhanes={links['nhanes']['person_id']}, "
            f"coaching={links['coaching']['participant_id']}"
        )
    relaxed = result["about"]["male_wearable_rule_relaxations"]
    if not relaxed:
        print("No male wearable-rule relaxation was needed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
