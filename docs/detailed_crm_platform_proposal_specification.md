# Comprehensive System Proposal & Technical Specification
## Integrated CRM Platform: Reservation Engine, Guest Database & Feedback Intelligence
**Target Entity:** GIOI OG  
**Author:** Yodha Kautsar  
**Document Version:** 1.0.0  
**Status:** Ideation & Architecture Proposal  

---

## 1. Executive Summary & Problem Diagnosis

### 1.1 Context & Strategic Objective
GIOI OG requires a modern, unified Customer Relationship Management (CRM) and reservation management platform. High-volume dining operations depend heavily on seamless guest intake, bespoke dining room hospitality, and high-frequency guest retention. 

Currently, reservations and customer interactions are fragmented across external channels (WhatsApp direct chats, inbound phone calls, direct messages on social media, and manual paper/spreadsheet records). This fragmentation causes operational bottlenecks, limits revenue optimization, and prevents personalized guest engagement.

```
Current Fragmented Reality:
[WhatsApp / Calls / IG DMs / Walk-ins] 
        ↓
[Manual Spreadsheets / Paper Notes] 
        ↓
Fragmented Guest History & Lost Relationship Intelligence
```

### 1.2 Core Problem Analysis & Operational Gaps

| Dimension | Current Operational Challenge | Latent Operational Gap | Strategic Opportunity |
| :--- | :--- | :--- | :--- |
| **Data Intake** | Guest data is scattered across personal WhatsApp chats, phone logs, and staff notebooks. | Lack of single, structured data schema to log guest contacts and attributes. | Convert 100% of guest interactions into structured, first-party data assets owned by GIOI OG. |
| **Guest Profiling** | Special dietary requests, seating preferences, and occasion details are lost between shifts. | Preferences rely on staff memory rather than standardized profiles. | Build institutional guest memory (VIP status, allergies, past dining habits, spend tiers). |
| **Communication** | Front-of-House (FOH) staff manually message guests for confirmations or neglect them altogether. | No automated $H-1$ or $H-0$ booking reminders; inconsistent post-dining farewell follow-ups. | Deploy automated WhatsApp Cloud API messaging for booking validation, pre-arrival preparation, and review collection. |
| **Analytics & BI** | Management has no consolidated, real-time view of daily covers, no-show rates, or booking pace. | Difficult to differentiate first-time guests from repeat patrons ($1\text{st}\text{-timer vs. repeater}$). | Real-time dashboards visualizing revenue pacing, retention curves, customer lifetime value ($\text{LTV}$), and operational load. |

---

## 2. Strategic Objectives & System Architecture Flow

The core system objective is to create a frictionless, closed-loop guest lifecycle connecting booking, dining, review collection, and re-marketing into one continuous operational cycle.

```
       ┌────────────────────────────────────────────────────────┐
       │                 THE 6-STAGE CLOSED LOOP                │
       └────────────────────────────────────────────────────────┘
  
   [01. BOOK]      ──>   [02. CAPTURE]   ──>   [03. REMIND]
  Guest books via       Real-time guest data   Automated WhatsApp
  web engine/portal     & preferences stored   $H-1$ / $H-0$ notifications
         │                                            │
         ▼                                            ▼
  [06. ANALYZE]    <──   [05. FAREWELL]  <──   [04. VISIT]
  BI dashboard turns    Automated post-dining  FOH delivers personalized
  data into insights    review & feedback link service using profile data
```

---

## 3. End-to-End Guest Lifecycle (Customer Journey Mapping)

```
[1. Discover] ──> [2. Reserve] ──> [3. Personalize] ──> [4. Confirm]
      │
      └───> [5. Reminder] ──> [6. Dine] ──> [7. Farewell] ──> [8. Retain]
```

### Phase-by-Phase Operational Matrix

| Phase | Channel / Touchpoint | Actions & Trigger Events | System Output & Processing |
| :--- | :--- | :--- | :--- |
| **1. Discover** | Instagram bio link, Website CTA, WhatsApp direct greeting, Google Maps profile. | Guest taps the reservation link. | Loads branded, responsive Web Reservation Widget. |
| **2. Reserve** | Online Reservation Portal | Guest selects date, party size (pax), timeslot, and seating area. | Real-time table inventory check against capacity rules. |
| **3. Personalize** | Online Reservation Portal | Guest enters dining preferences, occasion, dietary restrictions, and allergies. | Attributes linked directly to the reservation record. |
| **4. Confirm** | Automated WhatsApp Engine | Reservation submitted / deposit confirmed. | Instant WhatsApp confirmation dispatched with booking code and cancellation terms. |
| **5. Reminder** | Automated WhatsApp Engine | Automated cron trigger at $H-1$ day (24h prior) and $H-0$ day (morning of booking). | Reminder message dispatched with interactive buttons (Confirm / Reschedule / Cancel). |
| **6. Dine** | FOH Floor Management App / POS Integration | Guest arrives at GIOI OG. Staff updates status (`Seated` $\to$ `Billed` $\to$ `Completed`). | Kitchen/floor staff access special notes (e.g., anniversary dessert, gluten allergy). |
| **7. Farewell** | Automated WhatsApp Engine | Triggered $+2$ hours after table status is marked `Completed`. | Automated thank-you message with feedback link and Google Review CTA. |
| **8. Retain** | CRM Database & Marketing Engine | System updates guest visit frequency, total historical spend, and average spend per cover. | Guest segmented into automated re-engagement lists (e.g., "Inactive 60 Days", "VIP"). |

---

## 4. Module Specifications

### Module 1: Reservation Engine & Booking Portal

The booking portal serves as the primary direct-to-consumer digital intake point, engineered to eliminate reservation errors and automate manual data capture.

```
                          ┌──────────────────────────┐
                          │   Online Booking Form    │
                          └─────────────┬────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
     [Guest Information]                             [Reservation Parameters]
     • Full Name                                     • Party Size (Pax)
     • WhatsApp Contact                              • Date & Time Slot
     • Email Address                                 • Seating Area Category
     • Marketing Consent (Opt-in)                    • Special Request Notes
                 │                                             │
                 └──────────────────────┬──────────────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │   Reservation Rule Engine   │
                         │ • Table allocation logic    │
                         │ • Minimum spend validation  │
                         │ • Deposit gateway (if req.) │
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │ Unified Guest Record Created│
                         └─────────────────────────────┘
```

#### Detailed Specification Fields:
1. **Intake Data Structure:**
   * **Guest Details:** Full Name, WhatsApp Number (E.164 international format validation), Email Address, Country/City.
   * **Booking Parameters:** Date, Time Slot, Party Size (pax count), Seating Preference (Indoor Air-Conditioned vs. Outdoor Garden / Sunset View).
   * **Contextual Data:** Occasion Type (Birthday, Anniversary, Proposal, Business Dinner, Casual Gathering).
   * **Special Requests:** High chair requirement, cake/decor requests, accessibility/wheelchair needs, custom notes.
   * **Dietary & Allergies:** Dedicated checkboxes (Gluten-Free, Vegetarian, Vegan, Nut Allergy, Shellfish Allergy, Dairy-Free, Halal Preference) + open description text.
   * **Compliance:** Opt-in checkbox for promotional and marketing communication via WhatsApp/Email.

2. **Core Reservation Business Logic:**
   * **Inventory & Table Capacity Engine:** Configurable time slots, maximum covers per 15-minute intake window to prevent kitchen bottlenecks.
   * **Seating Area Allocation:** Configurable routing rules (e.g., groups $>8$ pax routed only to private dining or designated communal tables).
   * **Minimum Spend Enforcement:** Automatic conditional logic for prime seating (e.g., VIP booths or sunset tables during peak weekend dinner slots require pre-authorized minimum spend).
   * **Deposit Integration:** Integrated payment gateway link for large bookings or peak holiday dates, moving reservation status from `Pending Payment` to `Confirmed`.
   * **Lifecycle Status States:** `Pending`, `Confirmed`, `Seated`, `Completed`, `Cancelled`, `No-Show`.

---

### Module 2: Guest Database & 360° Profile Management

This module serves as the centralized source of truth for all customer records across the organization.

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      CENTRALIZED GUEST PROFILE                         │
 ├──────────────────────────┬─────────────────────────────────────────────┤
 │ Master Identity          │ Contact & Origin                            │
 │ • Unique Guest ID        │ • Verified WhatsApp / Mobile                │
 │ • Full Legal Name        │ • Verified Email Address                    │
 │ • Profile Classification │ • Residence (City / Country / International)│
 ├──────────────────────────┼─────────────────────────────────────────────┤
 │ Dining Preferences       │ Safety & Dietary Requirements               │
 │ • Preferred Seating Area │ • Strict Medical Allergies                  │
 │ • Favorite Drinks / Wine │ • General Dietary Restrictions              │
 │ • Sunset Preference      │ • Family Needs (e.g., High Chairs)          │
 ├──────────────────────────┼─────────────────────────────────────────────┤
 │ Behavioral Metrics       │ Reservation Timeline                        │
 │ • Total Lifetime Visits  │ • Chronological visit history               │
 │ • Historical Total Spend │ • Associated booking notes & occasions      │
 │ • Average Ticket / Cover │ • Cancellation and no-show history          │
 └──────────────────────────┴─────────────────────────────────────────────┘
```

#### Detailed Field Requirements:

1. **Guest Identity & Classification:**
   * Primary Key: Normalized Mobile Number / WhatsApp ID.
   * Secondary Key: Email Address.
   * Dynamic Status Badges:
     * `First-Timer`: Visit count $= 1$.
     * `Repeater`: Visit count between $2$ and $4$.
     * `Loyal / Regular`: Visit count $\ge 5$.
     * `VIP / High Spender`: Aggregate spend $> \$X$ or average spend per visit $> \$Y$.
     * `Corporate / Organizer`: Frequently books large parties.

2. **Preference & Occasion Matrix:**
   * **Occasions Logged:** Birthday, Wedding Anniversary, Date Night, Proposal, Corporate Entertainment.
   * **Physical Preference:** Indoor Non-Smoking vs. Outdoor Smoking vs. Sunset View terrace.

3. **Critical Service Notes:**
   * Persistent food allergies flagged with red high-visibility alerts across Kitchen Display Systems (KDS) and Floor POS devices.
   * Accessibility alerts (e.g., elderly family members needing easy access, pram storage).

4. **Internal Staff Notes & Team Visibility:**
   * Role-based note editing: FOH managers can leave private service notes (e.g., *"Prefers dry white wine, prefers corner table, responds well to Sommelier pairing recommendations"*).
   * Floor view: Accessible on service tablets during pre-shift briefings and live service.

---

### Module 3: WhatsApp Automation & Omnichannel Communication

To overcome the failure rate of manual messaging, the platform integrates with the Meta WhatsApp Cloud API to trigger transactional messages based on reservation lifecycle events.

```
                             [RESERVATION EVENT]
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
   [Booking Complete]         [Arrival -24h / -4h]         [Dining Ended +2h]
            │                         │                         │
            ▼                         ▼                         ▼
  Immediate Confirmation      H-1 / H-0 Reminders         Farewell & Feedback
  • Booking ID & Date         • Confirm/Cancel buttons    • Thank-you message
  • Pax & Table Category      • Directions & Parking      • Google Review CTA
  • Manage Booking Link       • Special Request Recap     • Feedback Loop
```

#### Notification Templates & Logic

#### 1. Instant Booking Confirmation
* **Trigger:** Triggered immediately when a booking is created or deposit is verified.
* **Message Payload:**
  * Guest Name.
  * Reservation ID / Confirmation Code.
  * Date, Arrival Time, and Party Size (Pax).
  * Assigned Area (Indoor / Outdoor).
  * Cancellation / Grace Period Policy (e.g., *"Table held for 15 minutes past booking time"*).
  * Interactive CTA Buttons: `[View Reservation Details]` | `[Modify / Cancel]`.

#### 2. Pre-Arrival Reminder ($H-1$ Day & $H-0$ Day)
* **Trigger:** Dispatched automatically 24 hours prior ($H-1$) and 4 hours before booking time ($H-0$).
* **Message Payload:**
  * Re-confirmation of date, time, and party size.
  * Location pin link (Google Maps) + valet/parking instructions.
  * Summary of noted special requests (e.g., *"We have prepared a high chair and noted your anniversary celebration"*).
  * Interactive CTA Buttons: `[Confirm Attendance]` | `[Reschedule Booking]` | `[Contact Host]`.

#### 3. Post-Dining Farewell & Reputation Engine
* **Trigger:** Dispatched automatically 2 hours after the reservation is closed out on the floor.
* **Message Payload:**
  * Personalized expression of gratitude from the GIOI OG management team.
  * Direct review CTA with bifurcated logic:
    * 5-star direct redirect to **Google Reviews / TripAdvisor**.
    * Scores $< 4$ stars open an **Internal Management Feedback Form** for service recovery.
  * Next-Visit incentive / invitation to upcoming seasonal culinary events.
* **Safety Rules:** Frequency capping logic (maximum 1 marketing follow-up per 14-day window to prevent notification fatigue).

---

### Module 4: Management Business Intelligence & Analytics Dashboard

The platform transforms raw reservation entries into real-time business intelligence for operational coordination and executive decision-making.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   GIOI OG MANAGEMENT BI DASHBOARD                      │
├───────────────────────────────────┬────────────────────────────────────┤
│ 1. REAL-TIME OPERATIONS           │ 2. GUEST MIX DYNAMICS              │
│ • Today's Total Bookings          │ • First-Timers vs. Repeaters (%)   │
│ • Total Expected Covers (Pax)     │ • VIP & High-Value Guest Share     │
│ • Real-time Completed Covers      │ • Occasion Mix (Birthday/Corp)     │
│ • Live No-Show & Cancel Metrics   │ • Domestic vs. International Mix   │
│ • Projected vs. Realized Spend    │ • Channel Acquisition Attribution  │
├───────────────────────────────────┼────────────────────────────────────┤
│ 3. RESERVATION PACING ANALYTICS   │ 4. CRM & RETENTION INTELLIGENCE    │
│ • Intake Curve by Day of Week     │ • Top 100 Returning Guest Profiles │
│ • Booking Concentration by Slot   │ • Average Return Frequency (Days)  │
│ • Average Booking Lead Time       │ • Recency, Frequency, Spend (RFM)  │
│ • Cancellation & No-Show Rate %   │ • Automated Segment Engagement     │
│ • Table Turn Velocity & Occupancy │ • Promotional WhatsApp Conversion  │
└───────────────────────────────────┴────────────────────────────────────┘
```

#### Detailed Metrics Specification:
1. **Real-Time Operational Pulse:**
   * **Projected Covers:** Total headcount confirmed for the day.
   * **No-Show Rate:** Calculated as:
     $$\text{No-Show Rate} = \left(\frac{\text{No-Show Covers}}{\text{Total Confirmed Covers}}\right) \times 100$$
   * **Table Turnover Speed:** Average duration per seating slot (minutes).

2. **Guest Cohort & Mix Breakdown:**
   * **First-Timer vs. Repeater Ratio:** Tracked across daily, weekly, and monthly periods:
     $$\text{Retention Share} = \left(\frac{\text{Repeat Guest Visits}}{\text{Total Realized Bookings}}\right) \times 100$$
   * **Acquisition Attribution:** Tracking where reservations originate (Instagram Bio Link, WhatsApp Direct, Walk-in, Google Business Profile).

3. **Predictive Planning & Lead Time Intelligence:**
   * Average lead time between booking creation and actual dining time (identifies how far in advance weekends and holidays book out).
   * Peak reservation velocity alerts (signals when specific seatings reach $85\%$ capacity).

---

## 5. Expected Business Outcomes & Strategic Value

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   FOR GUESTS    │       │ FOR RESTAURANT  │       │ FOR MANAGEMENT  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ • Instant book  │       │ • Zero lost data│       │ • Revenue pace  │
│ • WhatsApp sync │       │ • Less phone tag│       │ • RFM insight   │
│ • Needs honored │       │ • Shift clarity │       │ • Data planning │
│ • Better visits │       │ • Auto reviews  │       │ • Higher yield  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### 1. Value for the Guest
* **Frictionless Intake:** No waiting for manual chat replies; live table availability allows booking in under 60 seconds.
* **Certainty:** Automated confirmation and pre-arrival notifications provide clear location, parking, and booking details.
* **Personalized Hospitality:** Occasions, wine preferences, and allergies are recorded in advance, creating a customized experience.

### 2. Value for Restaurant Floor Operations
* **Operational Efficiency:** Saves roughly $1.5\text{ to }2.5$ man-hours daily by automating WhatsApp confirmations and follow-ups.
* **Error Elimination:** Removes illegible physical reservation books and miscommunicated WhatsApp details.
* **Shift Readiness:** Front-of-House and Kitchen leads start each shift with an accurate breakdown of covers, VIP arrivals, and allergies.

### 3. Value for Executive Management
* **First-Party Data Ownership:** Builds an owned, searchable database of verified customer contacts and behavioral histories.
* **Optimized Capacity & Yield:** Highlights low-occupancy dining slots, enabling targeted promotional campaigns to stabilize midweek covers.
* **Measurable Customer Retention:** Converts anonymous covers into identifiable profiles, helping track customer lifetime value ($\text{LTV}$) and repeat-visit frequency.

---

## 6. The Value Generation Flywheel

The CRM platform functions as a compounding growth engine. Each reservation refines the dataset, improving communication, hospitality, and retention.

```
      ┌────────────────────────────────────────────────────────┐
      │             GIOI OG VALUE FLYWHEEL DYNAMICS            │
      └────────────────────────────────────────────────────────┘

                     ┌───────────────────────────┐
                     │     1. RESERVATION        │
                     │  (Centralized Intake)     │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │         2. DATA           │
                     │ (First-Party Profiling)   │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │     3. COMMUNICATION      │
                     │  (Automated WhatsApp)     │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │       4. EXPERIENCE       │
                     │  (Personalized Dining)    │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │       5. RETENTION        │
                     │ (Repeat Visits & Reviews) │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │        6. REVENUE         │
                     │ (Higher LTV & Predictable)│
                     └─────────────┬─────────────┘
                                   │
                                   └───────────────┐
                                                   │
  (Compounding Cycle Returns to Step 1) ───────────┘
```

---

## 7. Recommended Implementation Roadmap

```
Phase 1 (Weeks 1-3)    : Architecture Design & Data Modeling
Phase 2 (Weeks 4-6)    : Booking Engine & WhatsApp API Integration
Phase 3 (Weeks 7-8)    : Staff Floor App & Pilot Testing at GIOI OG
Phase 4 (Weeks 9-10)   : Management BI Dashboard & Automated Campaigns
```

### Phase Breakdown
1. **Milestone 1: Intake & Core Architecture (Weeks 1–3)**
   * Finalize responsive online reservation interface.
   * Configure table topology, seating inventory zones, and opening schedules.
   * Establish cloud database schema for customer identities and booking entities.
2. **Milestone 2: Automation & Messaging Pipes (Weeks 4–6)**
   * Connect Meta WhatsApp Cloud API credentials.
   * Configure message templates (Confirmation, $H-1$, $H-0$, Post-dining review).
   * Implement automated cron engines and cancellation/confirmation webhook listeners.
3. **Milestone 3: FOH Deployment & Pilot Live Testing (Weeks 7–8)**
   * Deploy lightweight tablet-friendly Floor Management Web App for hosting teams.
   * Run pilot runs at GIOI OG to train floor managers and test intake flow.
4. **Milestone 4: BI Analytics & Executive Review (Weeks 9–10)**
   * Launch analytics reporting dashboards.
   * Set up automated weekly and monthly executive performance emails.
   * Enable automated segmentation rules for long-term customer re-engagement.