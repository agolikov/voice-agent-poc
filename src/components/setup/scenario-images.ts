type ScenarioImage = {
  src: string;
  alt: string;
};

/** Original, language-neutral artwork for the curated situation library. */
export const scenarioImages: Record<string, ScenarioImage> = {
  "airport-check-in": {
    src: "/images/scenarios/airport-check-in.jpg",
    alt: "A traveler discussing an overweight suitcase with an airport check-in agent",
  },
  "asking-directions": {
    src: "/images/scenarios/asking-directions.jpg",
    alt: "A local pointing out a route to a traveler on a city street",
  },
  "bank-account": {
    src: "/images/scenarios/bank-account.jpg",
    alt: "A newcomer discussing documents with a bank adviser",
  },
  "buying-a-sim": {
    src: "/images/scenarios/buying-a-sim.jpg",
    alt: "A customer comparing two SIM card plans with a shop assistant",
  },
  doctor: {
    src: "/images/scenarios/doctor.jpg",
    alt: "A patient explaining persistent pain to a doctor",
  },
  "hotel-check-in": {
    src: "/images/scenarios/hotel-check-in.jpg",
    alt: "A traveler explaining a room problem at a hotel reception desk",
  },
  "job-interview": {
    src: "/images/scenarios/job-interview.jpg",
    alt: "A candidate speaking with two interviewers across a meeting table",
  },
  pharmacy: {
    src: "/images/scenarios/pharmacy.jpg",
    alt: "A customer describing symptoms to a pharmacist",
  },
  "phone-call-landlord": {
    src: "/images/scenarios/phone-call-landlord.jpg",
    alt: "A tenant phoning about a broken boiler in a cold flat",
  },
  "renting-a-flat": {
    src: "/images/scenarios/renting-a-flat.jpg",
    alt: "A prospective renter pointing out damp during a flat viewing",
  },
  restaurant: {
    src: "/images/scenarios/restaurant.jpg",
    alt: "A diner politely explaining a wrong dish to a waiter",
  },
  "returning-an-item": {
    src: "/images/scenarios/returning-an-item.jpg",
    alt: "A customer returning a laptop that will not charge",
  },
  "small-talk-party": {
    src: "/images/scenarios/small-talk-party.jpg",
    alt: "Two strangers having a friendly conversation at a party",
  },
};
