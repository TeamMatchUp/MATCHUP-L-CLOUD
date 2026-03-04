Build Philosophy
Ship controlled infrastructure first.
 AI and promotional layers come after trust is built.
Match flow integrity > feature volume.

Phase 0 — Foundation (Week 1–2)
1. Project Setup
Initialize Vite + React + TypeScript


Install Tailwind + shadcn/ui


Define global design tokens (colors, spacing, typography)


Configure routing structure


Connect Lovable Cloud project


Checkpoint:
Landing page renders with design system active


Auth system connected



2. Authentication & Roles
Micro-tasks:
Implement email/password auth


Add optional Google OAuth


Create role selector on signup:


Organiser


Coach


Fighter


Store role in relational model


Build protected route wrapper


Implement role-based navigation


Checkpoint:
Role-based dashboard loads correctly


Permissions enforced



Phase 1 — Core Data Architecture (Week 3–4)
3. Core Entities in Lovable Cloud
Create relational tables:
Users


Gyms


FighterProfiles


Events


FightSlots


MatchProposals


Confirmations


MatchStatus


AIRecommendations (empty stub for now)


Enforce:
Foreign key integrity


MatchProposal requires:


FightSlot


Fighter A


Fighter B


Checkpoint:
Data can be created, read, updated, deleted


Status transitions logged



4. Public Discovery Layer
Build:
Public Events page


Event detail page


Public Fighter profile page


Open fight slot visibility


Confirmed fight display


Add filters:
Country (UK / USA / AUS)


Weight class


Date


Checkpoint:
Public browsing works without login


No match actions available publicly



Phase 2 — Structured Matchmaking Engine (Week 5–7)
5. Organiser Flow
Micro-steps:
Create Event form


Define Fight Slots


Manual fighter search


“Propose Match” action


Auto-create MatchProposal


Set status → Pending Coach


Add:
Audit log entry


Checkpoint:
Proposal triggers notification to Coach



6. Coach Approval Layer
Build:
Incoming Proposals list


Opponent comparison view


Accept / Decline buttons


Structured optional comment field


On Accept → status = Pending Fighter


On Decline → status = Declined


Checkpoint:
Status visibly updates across dashboards



7. Fighter Confirmation Layer
Mobile-first portal:
Proposal notification


Matchup card


Accept / Decline


On Accept → status = Confirmed


Confirmed match locks slot


Checkpoint:
Confirmed fights appear in public event page



Phase 3 — Dashboard Optimization (Week 8–9)
8. Organiser Dashboard (Control Room Mode)
Sections:
My Events


Open Slots


Pending Confirmations


Confirmed Fights


AI Suggestions (placeholder)


Enhancements:
Status color coding


Quick filters


Tight grid layout


Clear hierarchy



9. Coach Dashboard (Roster Mode)
Sections:
Gym profile


Fighter roster


Availability toggle


Incoming proposals


Submitted fighters


Event marketplace


Enhancements:
Card-based roster layout


Clear record presentation


Availability indicator



Phase 4 — AI Smart Match Assistant (Week 10–12)
10. AI Recommendation Engine v1
Inputs:
Weight class


Record difference


Experience delta


Geographic distance


Availability


Opponent history


Outputs:
Competitive balance score


Risk rating (Low / Moderate / High)


Experience gap metric


Implementation steps:
Build scoring logic (deterministic first)


Surface in organiser dashboard


Highlight top 3 suggestions per slot


Allow one-click “Propose”


Checkpoint:
AI suggestions feel advisory, not authoritative



Timeline Overview
Weeks 1–2: Setup + Auth
 Weeks 3–4: Core database + Public layer
 Weeks 5–7: Structured matchmaking engine
 Weeks 8–9: Dashboard refinement
 Weeks 10–12: AI assistant v1
MVP complete at Week 7.
 AI-enhanced version at Week 12.

Team Roles
Product Lead
Owns feature scope


Runs monthly 3-user usability test


Logs top 3 friction points


Frontend Engineer
UI implementation


Component system discipline


Accessibility compliance


Backend Engineer
Relational integrity


Status logic enforcement


Audit logging


AI/Logic Engineer (Phase 4)
Matching heuristics


Score transparency


Bias mitigation review



Recommended Rituals
Bi-weekly usability test (3 organisers or coaches)


Weekly status transition review


Monthly emotional design audit


AI fairness review before public rollout



Optional Integrations (Future)
Stripe (event listing fees)


Twilio (SMS confirmations)


SendGrid (structured notifications)


Google Maps API (venue geolocation)


Governing body databases (future verification layer)


