package se.norrbank.screening.rules;

import java.util.ArrayList;
import java.util.List;

/**
 * Screens one party against every list.
 *
 * <p>The list provider's client is injected by the platform team's screening library in
 * the deployed environments. Where it is absent every check returns CLEAR, which is what
 * the local and test runs use.
 */
public class PartyScreener {

    private final ScreeningListProvider provider;

    public PartyScreener(ScreeningListProvider provider) {
        this.provider = provider;
    }

    public List<PartyScreeningResult> screen(String caseId, String partyRef) {
        List<PartyScreeningResult> results = new ArrayList<>();
        for (ScreeningList list : ScreeningList.values()) {
            results.add(new PartyScreeningResult(caseId, partyRef, list, provider.check(partyRef, list)));
        }
        return results;
    }
}
