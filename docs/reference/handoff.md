# Ellie — Devin.ai Development Handoff

## Project Overview

Ellie is an AI-powered Lifestyle Medicine and Cancer Survivorship platform designed for hospital care teams and patients.

**Primary user:** Hospital care providers, including oncology navigators, health coaches, nurses, and survivorship coordinators.

**Secondary user:** Patients undergoing cancer treatment or transitioning into survivorship.

**Core mission:** Help care teams recognize emerging wellness concerns, understand lifestyle patterns, improve health-coaching quality, and coordinate personalized follow-up.

## Design System

**Design direction:** 70% Apple-inspired minimalism, 30% soft futurism.

**Signature UI:** Premium, responsive Bento Grid dashboard with varied card sizes, generous white space, soft shadows, subtle gradients, and rounded corners.

**Color palette:**
- Ellie Pink: `#F65398`
- Soft Blush: `#FFF0F6`
- Deep Plum: `#4A2034`
- Charcoal: `#29282D`
- Pure White: `#FFFFFF`
- Rose Pink: `#FBC6DF`
- Light Pink: `#FFE4F0`
- Muted Mauve: `#817680`

**Typography:** Inter or SF Pro, with system sans-serif fallback.

**Experience requirements:**
- Smooth, polished transitions
- Mobile-responsive layouts
- Accessible contrast and keyboard navigation
- Reduced-motion support
- Subtle luminous pink AI orb
- Clean, conversational interface
- No unnecessary visual clutter

Use the attached Ellie HTML prototype as the primary visual reference. Preserve its established branding while improving functionality and usability.

## Platform Architecture

Build **one unified Ellie application with role-based dashboards**.

### Provider Dashboard — Default Landing Page

The hospital command center should include:

1. Population overview and operational KPIs
2. Patient attention queue
3. Patient 360 profiles
4. AI-assisted wellness insights
5. Lifestyle Medicine modules
6. Care coordination and follow-up tasks
7. Coaching quality analytics
8. Resource navigation
9. Activity history and reporting

### Patient Dashboard

Create a simplified, supportive experience containing:

1. Personalized welcome
2. Wellness check-ins
3. Wearable activity and sleep trends
4. Glucose and lifestyle insights
5. Coaching goals and agreed next steps
6. Appointments and care journey
7. Support resources
8. Conversational Ellie AI companion

The patient should not see internal provider notes, coaching fidelity scores, or other patients' information.

## Three Lifestyle Medicine Challenges

### Challenge 3 — Rough Patch Radar

Detect potentially difficult periods during cancer treatment using wearable data.

Reference application:
https://c3-rough-patch.zay-259.workers.dev/

Display:
- Steps
- Sleep
- Resting heart rate
- Changes relative to personal baseline
- Potential rough-patch warnings
- Data quality and missing observations
- Suggested care-team review

### Challenge 4 — Glucose Guide

Help patients and coaches understand relationships between blood glucose, meals, meal timing, and movement.

Reference application:
https://c4-glucose-guide.zay-259.workers.dev/

Display:
- Glucose trends
- Meal timing
- Post-meal activity
- Relevant pattern comparisons
- Practical lifestyle coaching insights

Avoid claiming observational relationships establish causation.

### Challenge 5 — Coach's Co-pilot

Analyze recorded or live health-coaching conversations using motivational-interviewing principles.

Reference application:
https://coach.raava.dev/

Include:
- Conversation transcript
- Line-by-line coaching classifications
- Motivational-interviewing fidelity score
- Coaching recommendations
- Concerns requiring human review
- Supervisor review workflow
- Actionable follow-up tasks

Preserve the reference application's established scoring approach when technically feasible.

## Signature Feature — Ellie Care Loop

Implement a connected workflow:

**Detect → Understand → Review → Act → Follow Up**

Example:

1. Wearable data indicates a meaningful change.
2. Ellie displays the trend and supporting evidence.
3. A provider reviews the patient in Patient 360.
4. The provider creates or assigns a follow-up task.
5. The patient sees an appropriate update.
6. The care team documents the outcome.

## Technical Requirements

- Inspect the existing project before choosing the implementation approach.
- Reuse working code and components where possible.
- Preserve the established Ellie visual identity.
- Create reusable dashboard and Bento card components.
- Implement clear provider and patient navigation.
- Use role-based authorization for any real backend.
- Keep synthetic demonstration data separate from real patient data.
- Do not assume the three external challenge applications expose APIs.
- Verify API availability and permissions before attempting integration.
- Do not combine unrelated challenge datasets into one real patient record.
- Provide loading, empty, and error states.
- Keep AI recommendations explainable and subject to human review.
- Never imply the prototype is clinically validated or HIPAA-compliant.

## Hackathon Priorities

**Priority 1:** Fully functional provider dashboard and Patient 360.

**Priority 2:** Working Lifestyle Medicine feature demonstrations.

**Priority 3:** Patient-facing dashboard.

**Priority 4:** Connected alert-to-follow-up workflow.

**Priority 5:** Responsive polish, accessibility, and presentation readiness.

## Deliverables

Provide:
- Working application
- Organized, maintainable source code
- Responsive design
- Functional navigation and demonstration interactions
- Clear setup instructions
- Integration status for C3, C4, and C5
- Explicit documentation of simulated versus live functionality

**Goal:** Deliver a polished, credible hospital-facing AI application that demonstrates how Lifestyle Medicine insights can support cancer survivorship care.