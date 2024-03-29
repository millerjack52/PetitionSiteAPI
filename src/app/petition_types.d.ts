interface PetitionSearchQuery {
    q?: string;
    startIndex?: number;
    count?: number;
    categoryIds?: number[];
    supportingCost?: number;
    ownerId?: number;
    supporterId?: number;
    sortBy?: PetitionSortBy;
}

type PetitionSortBy =
    | 'ALPHABETICAL_ASC'
    | 'ALPHABETICAL_DESC'
    | 'COST_ASC'
    | 'COST_DESC'
    | 'CREATED_ASC'
    | 'CREATED_DESC';

type PetitionReturn = {
    petitions: Petition[];
    count: number;
}
type Petition = {
    petitionId: number;
    title: string;
    categoryId: number;
    ownerId: number;
    ownerFirstName: string;
    ownerLastName: string;
    numberOfSupporters: number;
    creationDate: string;
    supportingCost: number;
}

export { PetitionSearchQuery, PetitionSortBy, PetitionReturn, Petition };