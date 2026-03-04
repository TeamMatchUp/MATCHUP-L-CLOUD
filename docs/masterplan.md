📄 masterplan.md
Perfect. UK + USA + AUS gives us strong MMA + Muay Thai ecosystems from day one.
Recap (locking this in):
Neutral two-sided marketplace for professional fight matchmaking
Public discovery layer (events + fighters visible)
Structured, gated confirmation engine (Organiser → Coach → Fighter)
AI-assisted smart pairing with risk + balance indicators
Emotion: Strategic. Controlled. Professional. Bold.
Approved and moving forward.

📄 masterplan.md
30-Second Elevator Pitch
MatchUp is a professional fight operations platform for MMA and Muay Thai.
Organisers discover fighters openly.
Matches are proposed through a structured, tracked workflow.
No side deals. No chaos. Just confirmed fights.
Think: open marketplace visibility + governing-body-level control.

Problem & Mission
The Problem
Fight matchmaking today is:
Manual (DMs, WhatsApp, spreadsheets)
Fragmented across gyms and promoters
Informal and poorly tracked
Difficult to scale across regions
This creates:
Mismatches
Pullouts
Communication breakdown
Lost promotional opportunity
The Mission
Create a neutral, structured matchmaking marketplace where:
Discovery is open.
Execution is controlled.
Every confirmed fight is system-tracked.

Target Audience
Primary
MMA & Muay Thai event organisers (UK, USA, AUS)
Gym coaches managing active fighter rosters
Secondary
Competitive fighters (controlled access)
Fans (future visibility layer)

Core Features
1. Public Discovery Layer
Public event listings
Public fighter profiles
Open fight slots visible
Confirmed matchups visible
SEO-ready structure
Purpose: growth + exposure + legitimacy

2. Structured Matchmaking Engine
Organiser Flow
Create event
Define fight slots
Use manual search or AI Smart Match
Propose match
Coach Layer
Receive structured proposal
View opponent comparison
Accept / Decline
Optional structured comment field
Fighter Layer
Review matchup card
Accept / Decline
Status changes:
Pending Coach
Pending Fighter
Confirmed
Declined
Withdrawn
No informal confirmations.

3. AI Smart Match Assistant
Suggests based on:
Weight class alignment
Record parity
Experience delta
Style match
Geographic feasibility
Availability
Opponent history
Outputs:
Competitive balance indicator
Risk rating
Experience gap metric
Tone: analytical, calm, strategic.

4. Organiser Dashboard
Feels like a control room.
Sections:
My Events
Open Slots
AI Suggested Matches
Pending Confirmations
Confirmed Fights
Data-dense layout.

5. Coach Dashboard
Feels like managing a fight team.
Sections:
Gym Profile
Fighter Roster
Availability toggles
Incoming Proposals
Submitted Fighters
Event Marketplace
Slightly more breathing room than organiser UI.

6. Fighter Lite Portal (Mobile First)
Edit profile
Toggle availability
Review proposals
Accept / Decline
View upcoming confirmed fight
Minimal UI. No complexity.

High-Level Tech Stack
Frontend
Vite + TypeScript + React
Reason: performance + scalability + clean structure
UI System
shadcn/ui + Tailwind
Reason: component consistency + fast iteration + design system control
Backend & Storage
Lovable Cloud
Reason: scalable relational storage + match state integrity
Auth
Email/password + optional Google OAuth
Reason: ease of onboarding across UK/USA/AUS gyms

Conceptual Data Model (ERD in Words)
Entities:
User
Role (Organiser | Coach | Fighter)
Gym
FighterProfile
Event
FightSlot
MatchProposal
MatchStatus
Confirmation (Coach / Fighter)
AIRecommendation
Relationships:
Gym has many Fighters
Organiser creates many Events
Event has many FightSlots
FightSlot has one MatchProposal
MatchProposal requires two Confirmations
Confirmed Match belongs to Event
Strict relational integrity:
No match becomes confirmed without full approval chain.

UI Design Principles (Krug Applied)
Obvious status colors (no guessing)
One primary action per screen
No multi-meaning buttons
Status always visible
AI suggestions clearly labeled
Example:
Instead of “Continue”, use “Propose Match”.
No thinking required.

Security & Compliance Notes
Role-based access control
Match proposal audit log
GDPR compliance (UK + EU data awareness)
Data residency considerations (UK, USA, AUS)
Encrypted credentials
Structured permissions per role

Phased Roadmap
MVP
Public events
Public fighter profiles
Manual match proposals
Structured approval flow
Basic dashboards
V1
AI Smart Match Assistant
Risk indicators
Structured comparison view
Event marketplace filters (region, weight class)
V2
Rankings system
Performance analytics
Media event pages
Gym leaderboards
Historical fight database

Risks & Mitigations
Risk: Low initial liquidity
→ Mitigation: onboard organisers first, fighters follow events
Risk: Informal side deals bypassing platform
→ Mitigation: require official confirmation for listing
Risk: Data inaccuracy (fighter records)
→ Mitigation: coach verification layer
Risk: AI mismatch trust issues
→ Mitigation: transparent scoring indicators

Future Expansion Ideas
Commission tracking
Contract storage
Medical clearance uploads
Insurance documentation
Sponsorship marketplace
Broadcast integrations
Sanctioning body API hooks
