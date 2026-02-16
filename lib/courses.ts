// Update definitions to support nested curriculum
export interface Module {
    id: number | string;
    title: string;
    duration: string;
    status: "completed" | "current" | "locked";
    type?: "video" | "quiz" | "flashcards" | "text" | "live-class" | "exam" | "class-session"; // Added class-session
    route?: string;
    subModules?: Module[]; // Recursive structure for Class Sessions
    content?: {
        questions?: { text: string; options: string[]; correctIndex: number }[];
        cards?: { front: string; back: string }[];
        videoUrl?: string;
        body?: string;
        meetLink?: string;
        description?: string; // Added description for modules
    };
    practice?: PracticeItem[];
    referenceMaterials?: string[];
    keyObjectives?: string[];
}

export type PracticeType = 'quiz' | 'flashcard' | 'scenario';

export interface PracticeItem {
    id: string;
    type: PracticeType;
    question: string;
    // For Quiz
    options?: string[];
    correctIndex?: number;
    explanation?: string;
    // For Flashcard
    answer?: string; // Back of card
    // For Scenario
    scenarioContext?: string; // The situation
    correctAction?: string; // The right thing to do
}

export interface Course {
    id: string;
    title: string;
    description: string;
    price: number;
    duration: string;
    schedule: string;
    upcomingDates: string[]; // Specific start dates
    zoomLink: string; // URL for the live class
    image?: string;
    eligibilityRequirements?: string[];
    format: "Live + Online" | "Online" | "In-Person";
    modules: Module[];
    // New fields for logic
    nextSessionStart?: string; // ISO String
    nextSessionEnd?: string;   // ISO String
    documents?: {
        title: string;
        description: string;
        url: string;
        req_enrollment?: boolean; // If true, only show if enrolled
    }[];
}

// Helper to get "now" and "now + 2 hours" for demo purposes
const now = new Date();

export const COURSES: Course[] = [
    {
        id: "f89-flsd",
        title: "F-89: Fire and Life Safety Director",
        description: "The official 31-hour Initial Course required by FDNY. Includes comprehensive training on fire safety, emergency procedures, and active shooter protocols.",
        price: 600,
        duration: "31 Hours",
        schedule: "Mon-Fri, 9:00 AM - 4:00 PM EST",
        upcomingDates: [
            "Feb 10 - Feb 14, 2026",
            "Feb 24 - Feb 28, 2026",
            "Mar 10 - Mar 14, 2026"
        ],
        zoomLink: "https://zoom.us/j/example-meeting-id", // Placeholder
        image: "/courses/flsd-banner-v4.png",
        eligibilityRequirements: [
            "Must be at least 18 years of age.",
            "Must have a reasonable understanding of the English language.",
            "Must have 3 years of full-time work experience in fire safety, firefighting, building maintenance (with CoF), or related fields OR 18 months of experience with 6 continuous months at one location.",
            "Must be physically able to perform the duties of the position.",
            "Security Guard experience ALONE does not qualify without specific fire safety duties."
        ],
        format: "Live + Online",
        // Force "Live" status for Demo (Active Now)
        nextSessionStart: new Date(now.getTime() - 1000 * 60 * 30).toISOString(), // Started 30 mins ago
        nextSessionEnd: new Date(now.getTime() + 1000 * 60 * 60 * 4).toISOString(), // Ends in 4 hours
        documents: [
            {
                title: "FDNY F-89 FLSD Curriculum",
                description: "Official Fire and Life Safety Director Study Materials",
                url: "https://www.nyc.gov/assets/fdny/downloads/pdf/business/fire-and-life-safety-director-FLSD-curriculum.pdf",
                req_enrollment: true
            }
        ],
        modules: [
            {
                id: "class-1",
                title: "Class 1: Introduction & Fire Safety Basics",
                duration: "4 Hours",
                status: "current",
                type: "class-session",
                route: "/portal/learning/class-1",
                content: { description: "Course orientation, legal requirements, and the fundamental science of fire." },
                subModules: [
                    {
                        id: "c1-live",
                        title: "Class 1 Zoom Session",
                        duration: "4 Hours",
                        status: "current",
                        type: "live-class",
                        content: {
                            description: "Join the live instructor-led session for Class 1.",
                            meetLink: "https://zoom.us/j/123456789"
                        }
                    },
                    {
                        id: "c1-m1",
                        title: "Course Introduction & Requirements",
                        duration: "30m",
                        status: "current",
                        type: "text",
                        content: {
                            description: "Overview of the FLSD role, legal requirements, and course expectations.",
                            body: `
# Course Introduction

Welcome to the **Fire and Life Safety Director (FLSD) F-89 Course**. This 31-hour program is designed to prepare you for the responsibilities of an FLSD in New York City.

## The Role of an FLSD
The Fire and Life Safety Director is the most critical fire safety position in a high-rise building. You are responsible for:
*   Implementing the **Fire Safety and Evacuation Plan**.
*   Implementing the **Emergency Action Plan (EAP)** for non-fire emergencies.
*   Training building staff (Fire Wardens, Deputy Wardens).
*   Coordinate with **FDNY** during emergency incidents.

## Certification Process
To become a certified FLSD, you must:
1.  Complete this **31-hour course**.
2.  Pass the school's **Graduation Exam**.
3.  Pass the **FDNY Computer Based Exams** (Fire & Non-Fire).
4.  Pass the **FDNY On-Site Examination** at your building.
`
                        },
                        practice: [
                            // --- FLASHCARDS (20) ---
                            { id: "fc-1", type: "flashcard", question: "What does FLSD stand for?", answer: "Fire and Life Safety Director" },
                            { id: "fc-2", type: "flashcard", question: "Which FDNY Certificate of Fitness follows the F-89?", answer: "T-89 (Temporary)" },
                            { id: "fc-3", type: "flashcard", question: "How long is the F-89 course?", answer: "31 Hours" },
                            { id: "fc-4", type: "flashcard", question: "What three components make up the FLSD role?", answer: "Fire Safety, Non-Fire Emergencies (EAP), and Active Shooter/Medical" },
                            { id: "fc-5", type: "flashcard", question: "Who issues the FLSD Certificate of Fitness?", answer: "FDNY (New York City Fire Department)" },
                            { id: "fc-6", type: "flashcard", question: "What is Local Law 5?", answer: "The law requiring Fire Safety Directors in high-rise office buildings (1973)." },
                            { id: "fc-7", type: "flashcard", question: "What does EAP stand for?", answer: "Emergency Action Plan" },
                            { id: "fc-8", type: "flashcard", question: "What is the primary duty of an FLSD during a fire?", answer: "To man the Fire Command Station and coordinate with first responders." },
                            { id: "fc-9", type: "flashcard", question: "Can an FLSD leave the Fire Command Station during an alarm?", answer: "No, unless relieved by a Deputy FLSD or FDNY." },
                            { id: "fc-10", type: "flashcard", question: "What is a Class B office building?", answer: "A commercial office building occupied by more than 100 persons above or below street level, or more than 500 persons total." },
                            { id: "fc-11", type: "flashcard", question: "What is a Class R-1 building?", answer: "Hotels and motels (Transient Residential)." },
                            { id: "fc-12", type: "flashcard", question: "How often must an FLSD certificate be renewed?", answer: "Every 3 years." },
                            { id: "fc-13", type: "flashcard", question: "What is the 'On-Site' exam?", answer: "The practical exam conducted at your specific detailed building." },
                            { id: "fc-14", type: "flashcard", question: "What is the Z-50?", answer: "The examination for the FLSD On-Site verification." },
                            { id: "fc-15", type: "flashcard", question: "What represents the 'Chain of Command' in a building emergency?", answer: "FLSD -> Deputy FLSD -> Fire Wardens -> Deputy Wardens -> Searchers" },
                            { id: "fc-16", type: "flashcard", question: "True or False: The FLSD is responsible for training the outcome of Fire Drills.", answer: "True" },
                            { id: "fc-17", type: "flashcard", question: "What is the 'BIC'?", answer: "Building Information Card" },
                            { id: "fc-18", type: "flashcard", question: "Where must the BIC be located?", answer: "At the Fire Command Station." },
                            { id: "fc-19", type: "flashcard", question: "What is a 'Hot Work' permit?", answer: "Authorization for welding, cutting, or other spark-producing operations." },
                            { id: "fc-20", type: "flashcard", question: "What happens if the Fire Command Station is out of service?", answer: "A Fire Guard patrol must be maintained." },

                            // --- QUIZZES (20) ---
                            {
                                id: "q-1", type: "quiz",
                                question: "Which of the following is NOT a component of the Comprehensive Fire Safety and Emergency Action Plan?",
                                options: ["Fire Safety Plan", "Terrorism Response Plan", "Construction Safety Plan", "Medical Emergency Response Plan"],
                                correctIndex: 2,
                                explanation: "The Comprehensive Plan includes Fire Safety, Non-Fire/EAP, and Medical/Active Shooter components. Construction safety is separate."
                            },
                            {
                                id: "q-2", type: "quiz",
                                question: "The F-89 Certificate of Fitness is valid for:",
                                options: ["1 Year", "2 Years", "3 Years", "5 Years"],
                                correctIndex: 2,
                                explanation: "FLSD Certificates of Fitness must be renewed every 3 years."
                            },
                            {
                                id: "q-3", type: "quiz",
                                question: "In the event of a fire alarm, the primary location for the FLSD is:",
                                options: ["The floor of alarm", "The building lobby", "The Fire Command Station", "Checking the elevators"],
                                correctIndex: 2,
                                explanation: "The FLSD must report to the Fire Command Station to coordinate the response."
                            },
                            {
                                id: "q-4", type: "quiz",
                                question: "Who has supreme authority over the proper operation of the Fire Command Station during an incident?",
                                options: ["Building Manager", "FLSD", "FDNY Incident Commander", "Security Director"],
                                correctIndex: 2,
                                explanation: "Once FDNY arrives, the Incident Commander assumes full authority."
                            },
                            {
                                id: "q-5", type: "quiz",
                                question: "Which building type REQUIRES an FLSD?",
                                options: ["Residential Apartment House", "Group B Office Building (>100 people above/below grade)", "Small Retail Store", "Warehouse"],
                                correctIndex: 1,
                                explanation: "High-rise office buildings (Group B) meeting specific occupancy loads require an FLSD."
                            },
                            {
                                id: "q-6", type: "quiz",
                                question: "The FLSD course consists of how many hours of instruction?",
                                options: ["20 Hours", "31 Hours", "40 Hours", "10 Hours"],
                                correctIndex: 1,
                                explanation: "The standard FLSD initial course is 31 hours total."
                            },
                            {
                                id: "q-7", type: "quiz",
                                question: "Before taking the On-Site Exam, a candidate must pass:",
                                options: ["The computer-based FDNY exam (Z-89)", "A physical fitness test", "A driving test", "A credit check"],
                                correctIndex: 0,
                                explanation: "The Z-89 computer exam must be passed before scheduling the On-Site."
                            },
                            {
                                id: "q-8", type: "quiz",
                                question: "Fire Drills in office buildings must be conducted at least:",
                                options: ["Weekly", "Monthly", "Quarterly", "Annually"],
                                correctIndex: 2,
                                explanation: "Generally, drills are required quarterly for the first 2 years, then every 6 months, but 'Quarterly' is the standard initial answer for new buildings."
                            },
                            {
                                id: "q-9", type: "quiz",
                                question: "The 'Deputy FLSD' must hold:",
                                options: ["No certificate", "F-89 Certificate of Fitness", "Security License", "First Aid Card"],
                                correctIndex: 1,
                                explanation: "A Deputy FLSD must hold the same F-89 Certificate of Fitness as the primary FLSD."
                            },
                            {
                                id: "q-10", type: "quiz",
                                question: "If the Fire Command Station key is missing, the FLSD should:",
                                options: ["Go home", "Break the lock", "Notify FDNY provided they are on site, otherwise notify owner and ensure a backup is available", "Ignore it"],
                                correctIndex: 2,
                                explanation: "Access to the FCS is critical; the owner must immediate rectify this state."
                            },
                            {
                                id: "q-11", type: "quiz",
                                question: "Documentation of fire drills must be kept for:",
                                options: ["1 Year", "3 Years", "5 Years", "Forever"],
                                correctIndex: 1,
                                explanation: "Fire safety records, including drills, must generally be kept for 3 years."
                            },
                            {
                                id: "q-12", type: "quiz",
                                question: "Which colour helmet does the Fire Safety Director/FLSD typically wear during a drill?",
                                options: ["Yellow", "White", "Red", "Black"],
                                correctIndex: 0,
                                explanation: "The industry standard (and often required) is typically Yellow for the Director, though specific building plans may vary verbally; FDNY looks for identification."
                            },
                            {
                                id: "q-13", type: "quiz",
                                question: "Who is responsible for the 'All Clear' signal after a drill?",
                                options: ["Fire Warden", "FLSD", "The Tenant", "Security Guard"],
                                correctIndex: 1,
                                explanation: "The FLSD initiates and terminates the drill."
                            },
                            {
                                id: "q-14", type: "quiz",
                                question: "The 'EAP' component deals primarily with:",
                                options: ["Fire fighting tactics", "Non-fire emergencies (Bombs, Weather, etc.)", "Plumbing leaks", "Elevator repair"],
                                correctIndex: 1,
                                explanation: "Emergency Action Plans (EAP) cover non-fire emergencies."
                            },
                            {
                                id: "q-15", type: "quiz",
                                question: "What is the very first step an FLSD takes upon arriving at the Fire Command Station during an alarm?",
                                options: ["Announce evacuation", "Acknowledge the signal at the panel", "Call 911", "Run to the floor"],
                                correctIndex: 1,
                                explanation: "Detailed procedure starts with Acknowledging the signal to inspect the location."
                            },
                            {
                                id: "q-16", type: "quiz",
                                question: "A 'Warden Phone' allows communication between:",
                                options: ["Tenants and Security", "Floors and the Fire Command Station", "Building and FDNY HQ", "Elevators and Lobby"],
                                correctIndex: 1,
                                explanation: "Warden phones connect directly to the FCS."
                            },
                            {
                                id: "q-17", type: "quiz",
                                question: "Failure to perform FLSD duties can result in:",
                                options: ["A warning only", "Revocation of Certificate of Fitness", "A promotion", "Extra vacation"],
                                correctIndex: 1,
                                explanation: "Negligence can lead to revocation of the CoF."
                            },
                            {
                                id: "q-18", type: "quiz",
                                question: "Testing of the Fire Command Station's voice communication system occurs:",
                                options: ["Daily", "Quarterly", "Annually", "Never"],
                                correctIndex: 0,
                                explanation: "Functional tests of the communication system are often required daily."
                            },
                            {
                                id: "q-19", type: "quiz",
                                question: "The 'Building Information Card' (BIC) contains:",
                                options: ["Tenant names", "Structural and fire safety information for FDNY", "Lunch menu", "Wifi Passwords"],
                                correctIndex: 1,
                                explanation: "The BIC provides critical structural/system info for first responders."
                            },
                            {
                                id: "q-20", type: "quiz",
                                question: "A 'Fail-Safe' door lock means:",
                                options: ["It never opens", "It unlocks upon fire alarm activation", "It requires a special key", "It is made of steel"],
                                correctIndex: 1,
                                explanation: "Fail-safe locks release (unlock) when power is cut or an alarm triggers."
                            },

                            // --- SCENARIOS (10+) ---
                            {
                                id: "s-1", type: "scenario",
                                question: "A smoke detector activates on the 15th floor. You are at the Fire Command Station. What is your FIRST active step directly with the systems?",
                                scenarioContext: "Panel shows 'Smoke Detector - 15th Floor East Wing'. No other alarms.",
                                correctAction: "Acknowledge the alarm signal on the panel to silence the local panel buzzer and assess the specific location."
                            },
                            {
                                id: "s-2", type: "scenario",
                                question: "The Fire Warden on the 15th floor calls via Warden Phone and reports 'Smell of smoke, no visible flame'. What is your instruction?",
                                scenarioContext: "Alarm is acknowledged. FDNY has been notified automatically (or you are calling).",
                                correctAction: "Instruct the Warden to prepare for evacuation but wait for further instruction unless conditions worsen immediately. Dispatch a Brigade member to investigate if safe."
                            },
                            {
                                id: "s-3", type: "scenario",
                                question: "An active shooter is reported in the lobby while you are at the Fire Command Station. The fire alarm is NOT active. What do you do?",
                                scenarioContext: "Panic in the lobby. Reports of shots fired.",
                                correctAction: "Do NOT activate the fire alarm. Use the PA system to announce the Active Shooter protocol (avoiding code words if adherence to plain language law applies) and instruct tenants to Run, Hide, or Fight. Call 911."
                            },
                            {
                                id: "s-4", type: "scenario",
                                question: "FDNY arrives. Who do you speak to first?",
                                scenarioContext: "Firefighters are entering the lobby.",
                                correctAction: "Identify the Incident Commander (usually a Chief or highest ranking officer) and report the situation: Location of alarm, status of elevators, and status of HVAC."
                            },
                            {
                                id: "s-5", type: "scenario",
                                question: "A bomb threat is received via phone. The caller says a bomb is in the 'mailroom'. What do you do?",
                                scenarioContext: "You are on the phone with the threat maker.",
                                correctAction: "Keep the caller on the line. Signal someone else to call 911. enhancing information gathering (checklist). Do NOT pull the fire alarm."
                            },
                            {
                                id: "s-6", type: "scenario",
                                question: "During a power outage, the Fire Command Station panel goes dark. What is confirmed?",
                                scenarioContext: "Main power is lost. Emergency generator should be on.",
                                correctAction: "The backup batteries or generator failed. IMMEDIATELY implement a Fire Guard patrol as the building's fire detection system is compromised."
                            },
                            {
                                id: "s-7", type: "scenario",
                                question: "The elevator is recalled to the lobby (Phase I) but one car is stuck on the 20th floor with doors open. What do you tell FDNY?",
                                scenarioContext: "Panel shows Car 3 on 20th fl. Others in lobby.",
                                correctAction: "Report that Car 3 failed to recall and is located on the 20th floor. This is a life safety hazard for firefighters."
                            },
                            {
                                id: "s-8", type: "scenario",
                                question: "A tenant refuses to leave during a mandatory evacuation (fire verified).",
                                scenarioContext: "Warden reports Mr. Jones won't leave his office on the fire floor.",
                                correctAction: "Do not force him physically. Document the refusal. Instruct the Warden to evacuate themselves and others. Report the location of the refusal to FDNY upon arrival."
                            },
                            {
                                id: "s-9", type: "scenario",
                                question: "You find the Fire Command Station logbook hasn't been signed in 2 weeks.",
                                scenarioContext: "You are the new FLSD starting today.",
                                correctAction: "Make an entry stating you started today. Do not backdate. Report the deficiency to the building owner/manager as non-compliance."
                            },
                            {
                                id: "s-10", type: "scenario",
                                question: "A construction worker triggers a dust alarm. He calls and says 'It's just dust, ignore it'.",
                                scenarioContext: "Alarm on 3rd floor. Construction zone.",
                                correctAction: "You CANNOT reset the alarm based solely on his word. You must treat it as real until verified by a certified person (Fire Guard/Brigade) on scene or FDNY. Do not reset until the condition is cleared."
                            }
                        ]
                    },
                    {
                        id: "c1-m2",
                        title: "Legal Requirements & Local Law",
                        duration: "60m",
                        status: "locked",
                        type: "text",
                        content: {
                            body: `
# Legal Requirements

## Local Law 5 (1973)
Established earlier requirements for fire safety in high-rise office buildings, including the need for a Fire Safety Director.

## Local Law 26 (2004)
Passed after 9/11, this law mandated:
*   **Photoluminescent markings** in exit stairs.
*   **Sprinkler systems** in all office buildings 100 feet or higher.
*   Adoption of the new **Fire Code (2008)**.

## 3 RCNY § 113
The Rules of the City of New York (RCNY) outline the specific duties for the FLSD. You must be present in the building during regular business hours and be available to man the **Fire Command Station (FCS)** immediately.
`
                        }
                    },
                    {
                        id: "c1-m3",
                        title: "Fire Science: The Chemistry of Fire",
                        duration: "90m",
                        status: "locked",
                        type: "text", // Temporarily text for content
                        content: {
                            body: `
# The Chemistry of Fire

## The Fire Tetrahedron
For a fire to exist, four elements must be present. If you remove any ONE of them, the fire goes out.
1.  **Fuel**: Something to burn (wood, paper, gas).
2.  **Heat**: Sufficient energy to raise the fuel to its ignition temperature.
3.  **Oxygen**: Usually from the air (21% oxygen). Fire needs at least 16%.
4.  **Chemical Chain Reaction**: The self-sustaining process of combustion.

## Stages of Fire
1.  **Incipient Stage**: The beginning. Smoke may not be visible. Best time to use an extinguisher.
2.  **Growth Stage**: Fire grows, heat increases. Convection currents carry heat up.
3.  **Fully Developed Stage**: All combustible materials are burning. Temperatures can reach 2,000°F.
4.  **Decay Stage**: Fuel or oxygen is consumed, and the fire dies down.

## Heat Transfer
*   **Conduction**: Heat moving through a solid object (e.g., a hot pipe).
*   **Convection**: Heat moving through air/liquid currents (e.g., smoke rising in a shaft). **This is the primary way fire spreads in a building.**
*   **Radiation**: Heat moving as waves (e.g., heat from the sun or a fireplace).
`
                        }
                    },
                    {
                        id: "c1-m4",
                        title: "General Fire Code Requirements",
                        duration: "60m",
                        status: "locked",
                        type: "text",
                        content: {
                            body: `
# General Fire Code Requirements

## Occupancy Classifications
*   **Group B**: Business (Office Buildings). Most FLSDs work here.
*   **Group R-1**: Hotels/Motels (Transient).
*   **Group A**: Assembly (Theaters, Restaurants > 74 people).
*   **Group M**: Mercantile (Department Stores).

## Fire Prevention Codes
*   **Hot Work**: Welding/torching requires a permit and a Fire Guard (F-60).
*   **Decorations**: Curtains and decorations must be flame-resistant.
*   **Egress**: Exits must NEVER be blocked. Doors must open in the direction of travel.
`
                        }
                    }
                ]
            },
            {
                id: "class-2",
                title: "Class 2: Fire Protection Systems I",
                duration: "4 Hours",
                status: "current",
                type: "class-session",
                route: "/portal/learning/class-2",
                subModules: [
                    {
                        id: "c2-live",
                        title: "Class 2 Zoom Session",
                        duration: "4 Hours",
                        status: "current",
                        type: "live-class",
                        content: {
                            description: "Join the live instructor-led session for Class 2.",
                            meetLink: "https://zoom.us/j/123456789"
                        }
                    },
                    {
                        id: "c2-m1",
                        title: "Sprinkler Systems Overview",
                        duration: "80m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Sprinkler Systems

## Purpose
Automatic sprinkler systems are the most effective way to control or extinguish a fire in its early stages. They are designed to detect heat and discharge water directly over the fire.

## Types of Systems
1.  **Wet Pipe System**: Water is constantly present in the pipes. When a sprinkler head opens, water flows immediately. Most common in heated buildings.
2.  **Dry Pipe System**: Pipes are filled with pressurized air. When a head opens, air escapes, a valve opens, and water flows. Used in unheated areas (garages, attics) to prevent freezing.
3.  **Pre-Action System**: Requires TWO triggers (e.g., a smoke detector AND heat at the sprinkler head) to release water. Used in sensitive areas like computer rooms to prevent accidental water damage.

## Components
*   **Sprinkler Heads**: Identify by color code (e.g., Red = 155°F, Green = 200°F).
*   **Control Valves**: Must be "OS&Y" (Outside Screw and Yoke) type. If the stem is sticking out, it's OPEN.
*   **Siamese Connection**: Allows FDNY to pump water into the system from the street.
`
                        }
                    },
                    {
                        id: "c2-m2",
                        title: "Standpipe Systems",
                        duration: "80m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Standpipe Systems

## Purpose
Standpipes are essentially "vertical fire hydrants" inside the building. They provide water for firefighters to connect their hoses on upper floors.

## Classes of Standpipes
*   **Class I**: For Fire Department use (2 1/2 inch outlets).
*   **Class II**: For Occupant use (1 1/2 inch hose cabinets). *Note: Many Class II hoses are being removed for safety.*
*   **Class III**: Combination of both.

## Key Components
*   **Risers**: The vertical pipes carrying water up the building.
*   **Hose Outlets**: Located in stairwells.
*   **Pressure Reducing Valves (PRV)**: Ensure water pressure is safe for handling.
`
                        }
                    },
                    {
                        id: "c2-m3",
                        title: "Fire Pumps & Water Supplies",
                        duration: "80m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Fire Pumps & Water Supplies

## Water Sources
1.  **City Main**: The primary source of water.
2.  **Gravity Tank**: A water tank located on the roof. Uses gravity to provide pressure.
3.  **Suction Tank**: A tank in the basement stored for the fire pump.

## The Fire Pump
When city pressure is not enough to reach the top of the building, the **Fire Pump** activates.
*   **Automatic Mode**: The pump starts automatically when pressure drops (standard operation).
*   **Manual Mode**: Can be started by hand at the pump controller.
*   **Jockey Pump**: A small pump that maintains pressure in the system to prevent the main fire pump from cycling on/off unnecessarily.

## FLSD Responsibility
You must know the location of the fire pump room and be able to identify if the pump is running (usually indicated on the fire alarm panel).
`
                        }
                    }
                ]
            },
            {
                id: "class-3",
                title: "Class 3: Fire Protection Systems II",
                duration: "4 Hours",
                status: "current",
                type: "class-session",
                route: "/portal/learning/class-3",
                subModules: [
                    {
                        id: "c3-live",
                        title: "Class 3 Zoom Session",
                        duration: "4 Hours",
                        status: "current",
                        type: "live-class",
                        content: {
                            description: "Join the live instructor-led session for Class 3.",
                            meetLink: "https://zoom.us/j/123456789"
                        }
                    },
                    {
                        id: "c3-m1",
                        title: "Fire Alarm Systems",
                        duration: "90m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Fire Alarm Systems

## The Fire Command Center (FCC)
The central hub for all fire safety operations. It contains the **Fire Alarm Control Panel (FACP)**, which monitors the building's sensors.

## Initiating Devices
These are the sensors that trigger the alarm.
*   **Automatic**: Smoke detectors (ionization, photoelectric), heat detectors (fixed temp, rate-of-rise), waterflow switches (detects sprinkler activation).
*   **Manual**: Manual Pull Stations.

## Notification Appliances
These alert the occupants.
*   **Audible**: Bells, horns, sirens.
*   **Visual**: Strobe lights (for hearing impaired).
*   **Communication**: Voice evacuation systems (speakers).

## Types of Signals
1.  **Alarm Signal**: A fire has been detected (flashing RED light).
2.  **Supervisory Signal**: A system issue that needs attention but isn't a fire, e.g., low water tank level (flashing YELLOW light).
3.  **Trouble Signal**: A wiring or power fault (flashing YELLOW light).
`
                        }
                    },
                    {
                        id: "c3-m2",
                        title: "Smoke Control",
                        duration: "75m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Smoke Control Systems

## Purpose
Smoke inhalation is the leading cause of death in fires. Smoke control systems manage the movement of air to keep exit routes clear.

## Stairway Pressurization
*   Fans pump fresh air into the stairwells.
*   The **Higher Pressure** in the stairwell prevents smoke from entering when doors are opened.

## Post-Fire Smoke Purge
*   A manual system used by FDNY (not the FLSD) to exhaust smoke from the building *after* the fire is extinguished.
*   The FLSD must know where the **Smoke Purge Panel** is located.

## Dampers
*   **Fire Dampers**: Close automatically to stop FIRE from spreading through ducts.
*   **Smoke Dampers**: Close to stop SMOKE from spreading.
`
                        }
                    },
                    {
                        id: "c3-m3",
                        title: "Auxiliary Power Systems",
                        duration: "75m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Auxiliary Power Systems

## Emergency Generator
*   Powered by diesel or natural gas.
*   Must power specific life-safety systems (e.g., Fire Pump, Alarm System, Emergency Lighting, at least one elevator).
*   **Automatic Transfer Switch (ATS)**: Detecting power loss and switching to the generator automatically.

## Battery Systems (UPS)
*   Provide immediate, short-term power until the generator kicks in.
*   Often used for the Fire Alarm Control Panel (must last 24 hours on standby + 15 mins alarm).

## Emergency Lighting
*   Must illuminate exit paths (corridors, stairs) for at least 90 minutes during a blackout.
*   Photoluminescent (glow-in-the-dark) markings are a backup to this.
`
                        }
                    }
                ]
            },
            {
                id: "class-4",
                title: "Class 4: Emergency Procedures & Command",
                duration: "4 Hours",
                status: "current",
                type: "class-session",
                route: "/portal/learning/class-4",
                subModules: [
                    {
                        id: "c4-live",
                        title: "Class 4 Zoom Session",
                        duration: "4 Hours",
                        status: "current",
                        type: "live-class",
                        content: {
                            description: "Join the live instructor-led session for Class 4.",
                            meetLink: "https://zoom.us/j/123456789"
                        }
                    },
                    {
                        id: "c4-m1",
                        title: "Fire Command Station Operations",
                        duration: "90m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Fire Command Station (FCS) Operations

## The FCS
The FCS is the principal location for the FLSD. It must be staffed at all times during a fire emergency. It allows you to:
1.  Make building-wide announcements.
2.  Communicate with Floor Wardens.
3.  Monitor fire alarm signals.
4.  Control building systems (elevators, HVAC).

## Emergency Announcements
Announcements must be clear, calm, and concise.
*   **Initial Announcement**: Acknowledge the alarm, state that the cause is being investigated, and instruct occupants to stand by or evacuate if in immediate danger.
*   **Update Announcement**: Provide information as soon as it is available.
*   **All Clear**: Can ONLY be given upon authorization by the FDNY Incident Commander.
`
                        }
                    },
                    {
                        id: "c4-m2",
                        title: "Communications with FDNY",
                        duration: "60m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Communications with FDNY

## Reporting to 911
You must call 911 immediately upon the activation of a fire alarm unless you are absolutely certain it is a false alarm (e.g., testing).

## Greeting the FDNY
When the FDNY arrives, the FLSD must meet the Incident Commander at the **Fire Command Station**.
You must provide:
*   **Building Information Card (BIC)**.
*   **Master Keys** / Elevator Keys (2642).
*   **Floor Plans**.
*   **Current status** of the fire and the building's occupants (e.g., "Fire is on the 24th floor, evacuation in progress").
`
                        }
                    },
                    {
                        id: "c4-m3",
                        title: "Conducting Fire Drills",
                        duration: "90m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Conducting Fire Drills

## Frequency
*   **Existing Buildings**: Drills must be conducted at least **once every 6 months** for all occupants.
*   **New Buildings**: Drills must be conducted quarterly for the first two years.

## Procedure
1.  **Notify FDNY** that a drill is taking place (so they don't respond to a "false" alarm).
2.  **Activate** the alarm/announcement (using "Drill" mode if available).
3.  **Evaluate** the participants: Did they use the stairs? Did they listen to instructions?
4.  **Keep Records**: You must maintain a logbook of all drills for 3 years.
`
                        }
                    }
                ]
            },
            {
                id: "class-5",
                title: "Class 5: Fire Component Finalization",
                duration: "4 Hours",
                status: "current",
                type: "class-session",
                route: "/portal/learning/class-5",
                subModules: [
                    {
                        id: "c5-live",
                        title: "Class 5 Zoom Session",
                        duration: "4 Hours",
                        status: "current",
                        type: "live-class",
                        content: {
                            description: "Join the live instructor-led session for Class 5.",
                            meetLink: "https://zoom.us/j/123456789"
                        }
                    },
                    {
                        id: "c5-m1",
                        title: "Evacuation Concepts",
                        duration: "75m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Evacuation Concepts

## General Evacuation
Most alarms do NOT require a total building evacuation. The standard procedure for non-fireproof buildings is often total evacuation, but for **High-Rise Fireproof Office Buildings**, the concept is generally **In-Building Relocation**.

## In-Building Relocation (IBR)
*   Occupants are moved from the **Fire Floor** and the **Floor Above** to a safe location at least **three floors below** the fire.
*   This minimizes congestion in stairwells and allows firefighters clear access.
*   **Total Evacuation** is only ordered if there is an imminent threat to the entire building (e.g., structural failure, rapidly spreading fire).

## Sheltering in Place
In some scenarios (e.g., chemical release outside), it is safer to keep occupants inside and away from windows.
`
                        }
                    },
                    {
                        id: "c5-m2",
                        title: "Human Behavior",
                        duration: "45m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Human Behavior in Emergencies

## Panic vs. Anxiety
*   **Panic** (irrational, uncontrollable fear) is rare but contagious.
*   **Anxiety** is normal. The FLSD's goal is to manage anxiety so it doesn't turn into panic.

## Group Psychology
*   People look to others for cues. If staff members appear calm and professional, occupants will emulate that behavior.
*   **Leadership**: The FLSD and Fire Wardens must give clear, authoritative instructions. Ambiguity leads to confusion and delay.

## Reaction Time
People often delay evacuating to gather belongings or finish tasks.
*   **Instruction**: "Leave all personal belongings. Evacuate immediately."
`
                        }
                    },
                    {
                        id: "c5-m3",
                        title: "Tenant Training",
                        duration: "60m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Tenant Training

## Fire Wardens
*   One Fire Warden and Deputy Warden per floor (minimum).
*   Must be trained annually by the FLSD.
*   **Duties**: search the floor (bathrooms, closets), close doors, direct occupants to exits.

## Building Occupants
*   Must participate in fire drills.
*   Should know the location of emergency exits and manual pull stations.
`
                        }
                    },
                    {
                        id: "c5-m4",
                        title: "Fire Review",
                        duration: "60m",
                        status: "current",
                        type: "quiz",
                        content: {
                            description: "Review comprehensive quiz on Fire Components."
                        }
                    }
                ]
            },
            {
                id: "class-6",
                title: "Class 6: Non-Fire Emergencies (EAP)",
                duration: "4 Hours",
                status: "current",
                type: "class-session",
                route: "/portal/learning/class-6",
                subModules: [
                    {
                        id: "c6-live",
                        title: "Class 6 Zoom Session",
                        duration: "4 Hours",
                        status: "current",
                        type: "live-class",
                        content: {
                            description: "Join the live instructor-led session for Class 6.",
                            meetLink: "https://zoom.us/j/123456789"
                        }
                    },
                    {
                        id: "c6-m1",
                        title: "EAP Concepts",
                        duration: "60m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# EAP Concepts & Duties

## Fire Safety Plan (FSP) vs. Emergency Action Plan (EAP)
*   **FSP**: Specifically for FIRE emergencies.
*   **EAP**: For NON-FIRE emergencies (Medical, Explosion, Chemical, Shooter, Weather).

## The FLSD Role (Former EAP Director)
When an EAP incident occurs, you are the **EAP Director** until first responders arrive.
*   **FSP Staff**: Fire Wardens.
*   **EAP Staff**: EAP Wardens (often the same people).
*   **Critical Duty**: You must decide whether to Shelter in Place, In-Building Relocate, or Evacuate based on the specific threat.
`
                        }
                    },
                    {
                        id: "c6-m2",
                        title: "Medical Emergencies",
                        duration: "60m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Medical Emergencies (Non-MCI)

## FLSD Procedures for Individual Emergencies
1.  **Call 911**: Ensure EMS is en route.
2.  **Secure Elevator**: Designate an elevator for EMS use.
3.  **Deploy Staff**: Send a brigade member to the lobby to meet the ambulance and escort them to the patient.
4.  **CPR/AED**: If trained, staff can initiate CPR or use an AED (Automated External Defibrillator).

## Avoiding Delay
Seconds count. The most common delay is EMS not knowing which floor to go to or waiting for an elevator.
`
                        }
                    },
                    {
                        id: "c6-m3",
                        title: "Natural Hazards",
                        duration: "60m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Natural Hazards

## Severe Weather / Hurricanes
*   **Action**: Shelter in Place (Stay away from windows).
*   **Preparation**: Secure loose objects on roofs/setbacks. Check back-up generators and fuel supplies.

## Earthquakes
*   **Action**: Drop, Cover, and Hold On. Stay away from windows and heavy furniture. Do not use elevators.
*   **After**: Check for structural damage and gas leaks.
`
                        }
                    },
                    {
                        id: "c6-m4",
                        title: "Civil Threats",
                        duration: "60m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Civil Threats

## Bomb Threats
*   **Phone Threat**: Keep the caller on the line. Note background noises, voice characteristics. Use the **Bomb Threat Checklist**.
*   **Suspicious Package**: Do NOT touch, move, or open. Isolate the area (evacuate immediate vicinity). Call 911.

## Civil Disturbance
*   Secure building entrances.
*   Shelter occupants away from the lobby/street level.
`
                        }
                    }
                ]
            },
            {
                id: "class-7",
                title: "Class 7: Active Shooter & Medical Preparedness",
                duration: "4 Hours",
                status: "current",
                type: "class-session",
                route: "/portal/learning/class-7",
                subModules: [
                    {
                        id: "c7-live",
                        title: "Class 7 Zoom Session",
                        duration: "4 Hours",
                        status: "current",
                        type: "live-class",
                        content: {
                            description: "Join the live instructor-led session for Class 7.",
                            meetLink: "https://zoom.us/j/123456789"
                        }
                    },
                    {
                        id: "c7-m1",
                        title: "Active Shooter Protocols",
                        duration: "120m",
                        status: "current",
                        type: "video",
                        content: {
                            videoUrl: "https://www.youtube.com/embed/5VcSwejU2D0", // Placeholder (DHS Run Hide Fight)
                            body: `
# Active Shooter Protocols

## Run, Hide, Fight
The DHS and FBI recommended protocol for active shooter situations.

### 1. RUN (Avoid)
*   If there is an accessible escape path, attempt to evacuate the premises.
*   Have an escape route and plan in mind.
*   Leave your belongings behind.
*   Help others escape, if possible.

### 2. HIDE (Deny)
*   If evacuation is not possible, find a place to hide where the active shooter is less likely to find you.
*   Your hiding place should:
    *   Be out of the active shooter’s view.
    *   Provide protection if shots are fired in your direction (e.g., an office with a closed and locked door).
    *   Not trap you or restrict your options for movement.

### 3. FIGHT (Defend)
*   **As a last resort**, and only when your life is in imminent danger, attempt to disrupt and/or incapacitate the active shooter.
*   Act as violently as possible against him/her.
*   Throw items and improvise weapons.
*   Commit to your actions.
`
                        }
                    },
                    {
                        id: "c7-m2",
                        title: "Medical Preparedness (MCI)",
                        duration: "90m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Mass Casualty Incidents (MCI)

## Definition
An incident where the number of patients exceeds the available resources (ambulances, medics).

## Triage Concepts for the FLSD
You are not a paramedic, but you can facilitate the response.
*   **Green**: Minor injuries ("Walking Wounded"). Direct them to a safe collection point.
*   **Red**: Immediate life-threatening injuries. Needs priority transport.
*   **Black**: Deceased.

## Biological/Chemical Threats
*   If you suspect a chemical release, shut down the **HVAC System** immediately to prevent spread.
*   Isolate the affected area.
`
                        }
                    },
                    {
                        id: "c7-m3",
                        title: "Interaction with First Responders",
                        duration: "30m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Unified Command

## Joint Operations
In a major event (e.g., explosion), FDNY, NYPD, and EMS will form a **Unified Command**.
The FLSD serves as a liaison to provide building intelligence (blueprints, access control, camera feeds).

## Provide Critical Info
*   Location of the threat.
*   Number of potential victims.
*   Status of building systems (power, water, elevators).
`
                        }
                    }
                ]
            },
            {
                id: "class-8",
                title: "Class 8: Final Review",
                duration: "3 Hours",
                status: "current",
                type: "class-session",
                route: "/portal/learning/class-8",
                content: {
                    description: "The final review session before the Graduation Exam. Covers all key topics and provides study materials.",
                    questions: [
                        {
                            text: "What is the primary responsibility of the Fire and Life Safety Director during a fire emergency?",
                            options: [
                                "Evacuate the entire building immediately",
                                "Report to the Fire Command Station and coordinate with FDNY",
                                "Fight the fire with a portable extinguisher",
                                "Call the building owner"
                            ],
                            correctIndex: 1
                        },
                        {
                            text: "When must the Fire and Life Safety Director be present in the building?",
                            options: [
                                "24 hours a day",
                                "Only during fire drills",
                                "During regular business hours",
                                "Whenever the building manager is away"
                            ],
                            correctIndex: 2
                        },
                        {
                            text: "Which of the following is NOT a component of the Fire Triangle (Tetrahedron)?",
                            options: [
                                "Heat",
                                "Fuel",
                                "Nitrogen",
                                "Oxygen"
                            ],
                            correctIndex: 2
                        },
                        {
                            text: "What is the minimum passing score for this graduation exam?",
                            options: [
                                "50%",
                                "65%",
                                "70%",
                                "100%"
                            ],
                            correctIndex: 2
                        },
                        {
                            text: "Which class of standpipe system is designed for use by building occupants?",
                            options: [
                                "Class I",
                                "Class II",
                                "Class III",
                                "Class IV"
                            ],
                            correctIndex: 1
                        },
                        {
                            text: "How often must the FLSD Certificate of Fitness be renewed?",
                            options: [
                                "Every year",
                                "Every 3 years",
                                "Every 5 years",
                                "It does not expire"
                            ],
                            correctIndex: 1
                        },
                        {
                            text: "What does the 'A' in EAP stand for?",
                            options: [
                                "Alarm",
                                "Action",
                                "Authority",
                                "Assembly"
                            ],
                            correctIndex: 1
                        },
                        {
                            text: "Where is the Building Information Card (BIC) located?",
                            options: [
                                "Manager's Office",
                                "Security Desk",
                                "Fire Command Station",
                                "Mechanical Room"
                            ],
                            correctIndex: 2
                        },
                        {
                            text: "In a non-fireproof building, what is the standard evacuation procedure for a fire alarm?",
                            options: [
                                "Total Evacuation",
                                "Shelter in Place",
                                "In-Building Relocation",
                                "Wait for instructions"
                            ],
                            correctIndex: 0
                        },
                        {
                            text: "Who is authorized to give the 'All Clear' signal after a fire incident?",
                            options: [
                                "The FLSD",
                                "The Building Manager",
                                "The FDNY Incident Commander",
                                "The Fire Warden"
                            ],
                            correctIndex: 2
                        }
                    ]
                },
                subModules: [
                    {
                        id: "c8-live",
                        title: "Class 8 Zoom Session (Review)",
                        duration: "2 Hours",
                        status: "current",
                        type: "live-class",
                        content: {
                            description: "Join the live instructor-led review session before the exam.",
                            meetLink: "https://zoom.us/j/123456789"
                        }
                    },
                    {
                        id: "c8-m1",
                        title: "Comprehensive Review",
                        duration: "30m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Comprehensive Review

## Final Preparation
You have completed the 31-hour F-89 Fire and Life Safety Director course. This final session is dedicated to reviewing key concepts before the Graduation Exam.

## Key Topics to Review
1.  **Safety Director Duties**: Chain of command, staffing requirements, and liability.
2.  **Fire Protection Systems**: Know the difference between Standpipes and Sprinklers. Know your Fire Pump.
3.  **Alarms**: Identify the difference between Alarm, Supervisory, and Trouble signals.
4.  **Emergency Procedures**: Evacuation vs. Relocation vs. Shelter in Place.
5.  **Non-Fire Emergencies**: Active Shooter and Medical Emergency protocols.
`
                        }
                    },
                    {
                        id: "c8-m2",
                        title: "Download Materials",
                        duration: "30m",
                        status: "current",
                        type: "text",
                        content: {
                            body: `
# Course Materials

## Official Reference Documents
Please download the following documents for your records and future study for the FDNY Computer Exam.

*   [FDNY Study Guide (PDF)](#)
*   [Notice of Examination (NOE)](#)
*   [F-89 Reference Charts](#)

*(Note: These links will be active upon course completion)*
`
                        }
                    }
                ]
            },
            {
                id: "graduation-exam",
                title: "Graduation Exam",
                duration: "2 Hours",
                status: "current", // Or locked if sequential
                type: "exam",
                route: "/portal/exam",
                content: {
                    description: "The official Skyline Safety Services Graduation Exam.",
                    questions: [
                        {
                            text: "What is the primary responsibility of the Fire and Life Safety Director during a fire emergency?",
                            options: [
                                "Evacuate the entire building immediately",
                                "Report to the Fire Command Station and coordinate with FDNY",
                                "Fight the fire with a portable extinguisher",
                                "Call the building owner"
                            ],
                            correctIndex: 1
                        },
                        {
                            text: "When must the Fire and Life Safety Director be present in the building?",
                            options: [
                                "24 hours a day",
                                "Only during fire drills",
                                "During regular business hours",
                                "Whenever the building manager is away"
                            ],
                            correctIndex: 2
                        },
                        {
                            text: "Which of the following is NOT a component of the Fire Triangle (Tetrahedron)?",
                            options: [
                                "Heat",
                                "Fuel",
                                "Nitrogen",
                                "Oxygen"
                            ],
                            correctIndex: 2
                        },
                        {
                            text: "What is the minimum passing score for this graduation exam?",
                            options: [
                                "50%",
                                "65%",
                                "70%",
                                "100%"
                            ],
                            correctIndex: 2
                        },
                        {
                            text: "Which class of standpipe system is designed for use by building occupants?",
                            options: [
                                "Class I",
                                "Class II",
                                "Class III",
                                "Class IV"
                            ],
                            correctIndex: 1
                        },
                        {
                            text: "How often must the FLSD Certificate of Fitness be renewed?",
                            options: [
                                "Every year",
                                "Every 3 years",
                                "Every 5 years",
                                "It does not expire"
                            ],
                            correctIndex: 1
                        },
                        {
                            text: "What does the 'A' in EAP stand for?",
                            options: [
                                "Alarm",
                                "Action",
                                "Authority",
                                "Assembly"
                            ],
                            correctIndex: 1
                        },
                        {
                            text: "Where is the Building Information Card (BIC) located?",
                            options: [
                                "Manager's Office",
                                "Security Desk",
                                "Fire Command Station",
                                "Mechanical Room"
                            ],
                            correctIndex: 2
                        },
                        {
                            text: "In a non-fireproof building, what is the standard evacuation procedure for a fire alarm?",
                            options: [
                                "Total Evacuation",
                                "Shelter in Place",
                                "In-Building Relocation",
                                "Wait for instructions"
                            ],
                            correctIndex: 0
                        },
                        {
                            text: "Who is authorized to give the 'All Clear' signal after a fire incident?",
                            options: [
                                "The FLSD",
                                "The Building Manager",
                                "The FDNY Incident Commander",
                                "The Fire Warden"
                            ],
                            correctIndex: 2
                        }
                    ]
                },
                subModules: [
                    {
                        id: "final-exam-start",
                        title: "Official Graduation Exam",
                        duration: "120m",
                        status: "current",
                        type: "exam",
                        content: {
                            description: "You are about to begin the Final Graduation Exam. This exam is proctored. You must have a working webcam and microphone.",
                            body: `
# Graduation Exam

## Instructions
1.  Ensure you remain in a quiet room alone.
2.  Close all other browser tabs and applications.
3.  Click the button below to enter the **Secure Exam Portal**.
4.  You will be connected to a live proctor (or automated system) to verify your identity.

**Good Luck!**
`
                        }
                    }
                ]
            },
        ]
    },
    {
        id: "fire-guard-prep",
        title: "Fire Guard Preparation (F-01, F-02, F-03, F-04, F-60)",
        description: "Comprehensive preparation for FDNY Fire Guard Certificates of Fitness. Access pre-built learning modules for F-01, F-02, F-03, F-04, and F-60 at your own pace.",
        price: 80,
        duration: "4 Hours (Self-Paced)",
        schedule: "On-Demand / Self-Paced",
        upcomingDates: [
            "Start Immediately"
        ],
        zoomLink: "",
        image: "/courses/fireguard-banner-v4.png",
        eligibilityRequirements: [
            "Must be at least 18 years of age.",
            "Must have a reasonable understanding of the English language.",
            "No specific work experience required for Fire Guard."
        ],
        format: "Online",
        modules: [
            { id: "f01", title: "F-01: Citywide Fire Guard for Impairment", duration: "45m", status: "current", type: "flashcards" },
            { id: "f02", title: "F-02: Fire Guard for Shelters", duration: "45m", status: "locked", type: "flashcards" },
            { id: "f03", title: "F-03: Indoor Place of Assembly", duration: "45m", status: "locked", type: "flashcards" },
            { id: "f04", title: "F-04: Temp. Assembly Safety Personnel", duration: "45m", status: "locked", type: "flashcards" },
            { id: "f60", title: "F-60: Fire Guard for Torch Operations", duration: "45m", status: "locked", type: "flashcards" },
        ]
    },
    {
        id: "n85-fire-component",
        title: "FLSD Fire Component (N-85)",
        description: "The 20-hour Fire Safety module of the FLSD course. Prepares candidates for the N-85 exam. Ideal for those who only need the Fire Component training.",
        price: 350,
        duration: "20 Hours",
        schedule: "Mon-Wed, 9:00 AM - 4:00 PM EST",
        upcomingDates: [
            "Feb 10 - Feb 12, 2026",
            "Feb 24 - Feb 26, 2026"
        ],
        zoomLink: "https://zoom.us/j/example-n85",
        image: "/courses/n85-banner-v4.png",
        eligibilityRequirements: [
            "Must be at least 18 years of age.",
            "Reasonable understanding of English.",
            "Required for N-85 Certificate of Fitness exam."
        ],
        format: "Live + Online",
        modules: [
            { id: 1, title: "F-89: Fire Emergencies", duration: "3h", status: "locked", type: "text" },
            { id: 2, title: "Building Systems", duration: "3h", status: "locked", type: "text" },
        ]
    },
    {
        id: "z89-non-fire-component",
        title: "FLSD Non-Fire/EAP Component (Z-89)",
        description: "The 11-hour Non-Fire & Life Safety module. Covers Active Shooter, Medical Emergencies, and EAP. Prepares candidates for the Z-89 exam.",
        price: 250,
        duration: "11 Hours",
        schedule: "Thu-Fri, 9:00 AM - 3:00 PM EST",
        upcomingDates: [
            "Feb 13 - Feb 14, 2026",
            "Feb 27 - Feb 28, 2026"
        ],
        zoomLink: "https://zoom.us/j/example-z89",
        image: "/courses/z89-banner-v4.png",
        eligibilityRequirements: [
            "Must be at least 18 years of age.",
            "Reasonable understanding of English.",
            "Required for Z-89 Certificate of Fitness exam."
        ],
        format: "Live + Online",
        modules: [
            { id: 1, title: "Non-Fire Emergencies", duration: "3h", status: "locked", type: "text" },
            { id: 2, title: "Medical Emergencies", duration: "3h", status: "locked", type: "text" },
        ]
    }
];
