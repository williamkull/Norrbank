package se.norrbank.screening.rules;

/** The external list provider. */
public interface ScreeningListProvider {

    PartyOutcome check(String partyRef, ScreeningList list);

    /** The provider used when no list client is configured. Everything comes back clear. */
    static ScreeningListProvider clearingProvider() {
        return (partyRef, list) -> PartyOutcome.CLEAR;
    }
}
