// Demo inputs. These six texts are FABRICATED for demonstration (invented people, figures and claims; the false
// claims are deliberately false). They are inputs only: every result shown for them comes from the live API.
// Source of truth: docs/samples/ (kept in sync by hand; a test checks the ids and word counts).

export const EXAMPLES = [
  {
    "id": "01-normal-news",
    "title": "Measles outbreak report",
    "kind": "Normal",
    "note": "In-domain news with matching reference passages.",
    "text": "Health officials in the northern region said on Tuesday that a measles outbreak has spread to three more towns, with 42 confirmed cases since the start of the month. The regional health department said most of the infected children had not received the recommended vaccine doses, and it has opened extra clinics to offer free vaccinations to families over the next two weeks.\n\n\"Measles spreads very easily through the air, and the best protection we have is two doses of the vaccine,\" said Dr. Helen Marsh, the department's director of public health. She said staff were contacting schools and nurseries to identify children who may have been exposed and to advise families on what to do if symptoms appear, including fever, cough and a rash.\n\nThe department said that no deaths have been reported so far, although seven patients have required treatment in hospital. Local schools will keep open as planned, but unvaccinated children who have been in contact with a confirmed case will be asked to stay at home for up to three weeks. A spokesperson added that the outbreak is being monitored daily and that updated figures will be published on the department's website each Friday."
  },
  {
    "id": "02-misleading-sensational",
    "title": "Loud claim about antibiotics",
    "kind": "Misleading, loud",
    "note": "A false claim in an urgent, all-caps style.",
    "text": "SHOCKING TRUTH THEY DON'T WANT YOU TO KNOW!!! Antibiotics CURE the flu in just 24 HOURS and Big Pharma has been HIDING it from you for DECADES!!!\n\nWake up, people! A brave whistleblower has EXPOSED the biggest medical cover-up in history. Doctors are SILENCED while millions suffer through the flu every winter, when a simple antibiotic pill could END it overnight. The mainstream media will NEVER tell you this. Your pharmacist is in on it too!!!\n\nShare this BEFORE it gets deleted! Every hour you wait is an hour your family is in danger. Stop trusting the so-called experts and take control of your own health TODAY. This is URGENT!!!"
  },
  {
    "id": "03-misleading-sober",
    "title": "Calm claim about a flu cure",
    "kind": "Misleading, calm",
    "note": "A false claim written like ordinary news. The classifier is not expected to catch it.",
    "text": "A hot drink made from lemon and honey can cure influenza within a single day, according to a study published by a regional health institute this week. The researchers said that patients who drank the mixture three times daily recovered faster than those who took no treatment, and that the drink removed the need for vaccination against the virus.\n\n\"Our results show a clear and rapid recovery, and we believe that annual flu vaccines are no longer necessary for healthy adults,\" said the study's lead author, who works at the institute. The report said that 120 volunteers took part and that nearly all of them reported feeling better after 24 hours.\n\nA spokesperson for the institute said the findings would be shared with local clinics later this month. The study has not yet been reviewed by outside experts, and the institute did not say how the volunteers were selected or whether the symptoms of the group that received no treatment were compared over the same period. Several pharmacies in the area have already begun promoting the drink to customers as an alternative to seasonal vaccination."
  },
  {
    "id": "04-out-of-domain",
    "title": "Sourdough guide",
    "kind": "Out of domain",
    "note": "Nothing like the training news; the domain check should flag it.",
    "text": "Sourdough bread is made by fermenting dough with a culture of wild yeast and lactic acid bacteria, known as a starter, rather than with commercial yeast. To make a starter, mix equal weights of flour and water in a clean jar and leave it at room temperature, adding a little fresh flour and water each day. After about a week the mixture should smell pleasantly sour and show plenty of bubbles. When the starter doubles in size within a few hours of feeding, it is ready to use.\n\nFor a simple loaf, combine five hundred grams of strong white flour, three hundred and fifty grams of water, one hundred grams of active starter and ten grams of salt. Stretch and fold the dough every half hour for two hours, then let it rise slowly at room temperature until it has grown by about half. Shape the loaf, place it in a floured basket and chill it overnight. Bake in a very hot covered pot for twenty minutes with the lid on and twenty minutes with it off, until the crust is deep brown. Let the bread cool completely before slicing."
  },
  {
    "id": "05-insufficient-evidence",
    "title": "Council rezoning vote",
    "kind": "Insufficient evidence",
    "note": "Plausible local news; no reference passage is related.",
    "text": "The city council voted 6 to 3 on Monday night to approve a rezoning proposal that would allow a four-storey apartment building on a former car dealership site at the corner of Maple and Fifth. The developer said the project would include 96 apartments, a small ground-floor cafe and underground parking, and that construction could begin next spring if permits are granted.\n\nSeveral residents spoke against the plan during the public hearing, saying the building would be taller than anything nearby and would add to traffic on Maple Street. Councillor David Ortiz, who supported the proposal, said the city needs more housing and that the developer had agreed to set aside ten percent of the units at reduced rents.\n\nCouncillor Priya Nair, who voted against it, said she was concerned about parking and about the loss of local businesses. The mayor said a traffic study would be carried out before final approval, and that the council would review the results in the autumn. The next council meeting will be held on the first Monday of next month at city hall."
  },
  {
    "id": "06-short-headline",
    "title": "One-line headline",
    "kind": "Very short",
    "note": "Far below the length the classifier was trained on.",
    "text": "Scientists reveal fruit that cures all diseases overnight"
  }
]
