from medicine_matching import matching_engine


def normalize_medicine_name(
    medicine: str
):
    return matching_engine.match_medicine(
        medicine
    )


def get_alternatives(
    generic_name: str
):
    return matching_engine.get_all_brands(
        generic_name
    )