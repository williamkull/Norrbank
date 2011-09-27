package se.norrbank.screening.rules;

public record PartyScreeningResult(String caseId, String partyRef, ScreeningList list, PartyOutcome outcome) {

    public boolean isSanctionsList() {
        return list == ScreeningList.EU_CONSOLIDATED_SANCTIONS
                || list == ScreeningList.OFAC_SDN
                || list == ScreeningList.UN_CONSOLIDATED;
    }

    public boolean isPepList() {
        return list == ScreeningList.PEP_GLOBAL;
    }
}
