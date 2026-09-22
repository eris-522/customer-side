/**
 * Terms and Conditions / Catering Service Agreement Data
 * Official contract specifications for Roxan Policarpio Events & Catering
 */

export interface ContractRateItem {
  label: string;
  price: string;
  note?: string;
}

export interface ContractTermItem {
  id: string;
  number: number;
  category: "payment" | "adjustments" | "corkage" | "logistics" | "operations" | "liability" | "legal";
  title: string;
  content: string;
  badge?: string;
  alertNotice?: string;
  rates?: ContractRateItem[];
}

export const CATERING_CONTRACT_TERMS: ContractTermItem[] = [
  {
    id: "cancellation",
    number: 1,
    category: "payment",
    title: "CANCELLATION",
    badge: "Strictly Non-Refundable",
    content:
      "The CLIENT shall agree that the RESERVATION FEE, DOWN PAYMENT or ANY AMOUNT settled upon execution of this agreement is strictly NON-REFUNDABLE, NON-TRANSFERABLE and NON-CONSUMABLE. In the event that the CLIENT canceled or postponed its event, any and all payments made to the CATERER shall be forfeited. All outstanding payments due to vendors are the responsibility of the CLIENT and may be due based upon the cancellation policies of the vendors.",
  },
  {
    id: "force-majeure",
    number: 2,
    category: "payment",
    title: "FORCE MAJEURE",
    content:
      "The CATERER shall not be responsible or liable for any losses resulting from non-fulfilment of any terms or provisions of this agreement which result from circumstances beyond the reasonable control of the CATERER, including but not limited to acts of God; earthquakes; fires; floods; wars; civil or military disturbances; strikes; epidemics; riots; power failures or by events of any mishaps that may occur before or during the event including orders, directive or any law imposed by the any government authority.",
  },
  {
    id: "down-payment",
    number: 3,
    category: "payment",
    title: "DOWN PAYMENT",
    badge: "50% Standard Rate",
    content:
      "Fifty percent (50%) down payment of the total event cost is due and demandable at the time of booking or 7 DAYS after reservation, to be deducted from the total final payment, unless other prior arrangements have been made.",
  },
  {
    id: "billing",
    number: 4,
    category: "payment",
    title: "BILLING",
    badge: "Strictly 15 Days Before Event",
    content:
      "CLIENT agrees to pay the remaining balance strictly 15 DAYS BEFORE the EVENT DATE.",
  },
  {
    id: "installment-basis",
    number: 5,
    category: "payment",
    title: "INSTALLMENT BASIS",
    badge: "20% Booking Deposit",
    content:
      "This payment scheme is available upon request. Twenty percent (20%) down payment of the total event cost is required upon booking. This will be deducted from the total payment or remaining balance. Installment payment will be based on the remaining months before the event date and CLIENT agrees to pay on the due date.",
  },
  {
    id: "changes",
    number: 6,
    category: "adjustments",
    title: "CHANGES",
    badge: "14 Days Prior Notice",
    content:
      "Changes and/or adjustments regarding the event details, menu, and other package inclusions shall be communicated by the CLIENT to the CATERER two (2) weeks or fourteen (14) days prior to the actual date of the event. The CLIENT understands that last minute service changes can impact the quality of the event and that the CATERER/Event Organizer is not responsible for any compromises in quality owing to such changes.",
  },
  {
    id: "out-of-town-charges",
    number: 7,
    category: "adjustments",
    title: "OUT OF TOWN CHARGES",
    badge: "Outside Taytay, Rizal",
    content:
      "This will apply for events outside Taytay, Rizal. Any additional expenses incurred by the CATERER in connection with the planning and execution of the Event will be paid by the CLIENT in accordance with the agreed-upon budget.",
  },
  {
    id: "corkage-fees",
    number: 8,
    category: "corkage",
    title: "CORKAGE FEE FOR ADDITIONAL SERVICE/S",
    content:
      "Special corkage fees and service inclusions will strictly apply for additional culinary setups and outside food or drinks brought into the venue:",
    rates: [
      {
        label: "LECHON TABLE W/ CHOPPER",
        price: "PHP 1,500",
        note: "Inclusions are half long table, 50 small plates for lechon, chafing dish, chopping knife and board, sauce dish, serving spoons and tongs. Plus, 1 waiter will be strictly assigned as the lechon chopper during the event.",
      },
      {
        label: "ALCOHOLIC BEVERAGES / BEER",
        price: "PHP 400",
        note: "Any kinds per bottle. Inclusions are ice, water and drinking glass.",
      },
      {
        label: "OUTSIDE FOOD",
        price: "PHP 400 / food",
        note: "Will apply if CLIENT will bring outside food not coming from the CATERER for the extra chafing dish and food warmer.",
      },
    ],
  },
  {
    id: "hauling-fee",
    number: 9,
    category: "logistics",
    title: "HAULING FEE",
    badge: "PHP 150 / floor per waiter",
    content:
      "Shall be charged for a farther and complicated venue and if the venue location is on the second floor/up WITHOUT ELEVATOR (PHP 150 / floor per waiter).",
  },
  {
    id: "product-unavailability",
    number: 10,
    category: "adjustments",
    title: "PRODUCT UNAVAILABILITY",
    content:
      "In the event a product/s become/s unavailable in the market due to unforeseen conditions or becomes unavailable in any other manner beyond the CATERER’s control, the CATERER reserves the right to make reasonable substitutions to such products with notice to the CLIENT.",
  },
  {
    id: "exceeded-guests",
    number: 11,
    category: "operations",
    title: "EXCEEDED NUMBER OF GUESTS",
    badge: "PHP 500 / pax excess",
    content:
      "The CLIENT will only be charged for the guaranteed number of guests served. If there are more guests attending than the guaranteed guest count, the CATERER will charge the CLIENT accordingly and the client agrees to pay the excess guests per plate on the day after the event of (PHP 500/pax).",
  },
  {
    id: "supplier-crew-meals",
    number: 12,
    category: "operations",
    title: "SUPPLIER CREW MEALS",
    badge: "Client Responsibility",
    content:
      "CATERER is not liable for the food of its suppliers such as the Coordinators, crew members of Sounds and Lights, Photo and Video, Photo Booth, Makeup Artist, Host, Clown, Etc. on the day of the Event. Crew meal is part of SOP (standard operating procedure) for event suppliers and will be shouldered by the CLIENT whether it be a meal allowance/packed food/catered food.",
  },
  {
    id: "insurance-indemnification",
    number: 13,
    category: "liability",
    title: "INSURANCE AND INDEMNIFICATION (Stolen/Damages)",
    badge: "Appraised & Paid After Event",
    content:
      "CATERER shall procure and maintain in full force and effect during the term of this Contract a general liability insurance policy. CLIENT agrees to compensate and hold harmless CATERER for any damage, theft or loss of CATERER's property (including without limitation, equipment, plates, utensils and motor vehicles) occurring at the event that is caused by persons attending the event. It is understood by the CLIENT that the CATERER shall not in any manner be liable to the safekeeping of the personal and valuable belongings of its guests. The CATERER and/or his representative in the event shall immediately make an appraisal of the amount of damages which shall be paid by the CLIENT STRICTLY after the event.",
  },
  {
    id: "exceeding-hours",
    number: 14,
    category: "operations",
    title: "EXCEEDING HOUR/S PER SERVICE",
    badge: "4-Hour Duration Limit",
    content:
      "The CLIENT agrees and confirms that ALL services included on the package will only last and limited for 4 HOURS from 7pm - 11pm. For any exceeding hour/s, an additional payment of Php 4,000.00 will incur for CATERING SERVICE only. Additional charges for time extension of other services are as follows:",
    alertNotice: "NOTE: A minute is automatically equal to 1 hour OT service.",
    rates: [
      { label: "Catering Service (Overtime)", price: "PHP 4,000.00 / hr" },
      { label: "Sounds and Lights", price: "PHP 1,500 / hr" },
      { label: "Photo Booth Service", price: "PHP 1,000 / hr" },
      { label: "Emcee / Host", price: "PHP 500 / hr" },
      { label: "Coordinator/s", price: "PHP 300 / hr per person" },
      { label: "Photo and Video Service", price: "PHP 2,500 / hr" },
      { label: "Mobile Bar", price: "PHP 1,500 / hr" },
    ],
  },
  {
    id: "outside-food-health-risk",
    number: 15,
    category: "liability",
    title: "OUTSIDE FOOD HEALTH RISK",
    badge: "Health Waiver",
    content:
      "If the CLIENT chooses to bring food on their own, the CATERER is not liable for health risks such as food poisoning, diarrhea and the like that was caused by the food not prepared by us. Since bacteria can travel through air, the CATERER is also no longer liable if cross-contamination happens.",
  },
  {
    id: "breach-cancellation",
    number: 16,
    category: "legal",
    title: "CANCELLATION OR BREACH OF THIS AGREEMENT",
    content:
      "CANCELLATION OR BREACH OF THIS AGREEMENT shall entitle the CATERER to forfeit any amount made prior to and/or after the signing of this agreement. Such breach shall release the CATERER from its obligation under this agreement to provide the services first agreed upon.",
  },
  {
    id: "outdoor-event-risks",
    number: 17,
    category: "liability",
    title: "OUTDOOR EVENT RISKS",
    badge: "PHP 2,000 Extra Laundry Charge",
    content:
      "In case of rain and no tents were provided by the CLIENT, Php 2,000.00 will be charged for extra laundry expenses.",
  },
  {
    id: "food-spoilage",
    number: 18,
    category: "liability",
    title: "FOOD SPOILAGE DUE TO DELAY OF SERVING",
    alertNotice:
      "WARNING: Food exposed to room temperature for more than 3 hours might get spoiled. Take-out food relieves the caterer of liability.",
    content:
      "Delay on the stated serving time not brought about by the CATERER or the take-out of left-over food, shall relieve the CATERER from any liability arising from food poisoning or any other injury as a result of spoilage. The CLIENT is therefore warned that food exposed to room temperature for more than 3 hours might get spoiled. The CLIENT shall ensure that no hindrance shall be brought to the CATERER for serving the food and shall be responsible to warn his/her guests of spoilage if the foods are taken out of the venue.",
  },
  {
    id: "complaints",
    number: 19,
    category: "legal",
    title: "COMPLAINTS",
    badge: "Strict 24-Hour Window",
    content:
      "If there are complaints as regards the services provided by the CATERER, the same must be submitted by the CLIENT within twenty-four (24) hours after the event. Non-submission of the complaint renders the service provided by the CATERER satisfactory. In case of problems or other causes/issues regarding our contract, the only right person to complain is the CLIENT who signed the contract. No other parties involved, like parents, relatives or friends, for they don't know what we have agreed upon. Social Media is the turning point of every individual to complain if they know to themselves that they can't do it legally. We can file a case against you if this happens.",
  },
  {
    id: "entire-contract",
    number: 20,
    category: "legal",
    title: "ENTIRE CONTRACT",
    content:
      "This Contract constitutes the entire contract of the parties with respect to the subject matter, and all other agreements, understandings, statements, or representations, either oral or in writing.",
  },
];

