import json

from app.services.live.upstream import TurnEvent, parse_message


def test_partial_and_final_turns():
    partial = {"type": "Turn", "turn_order": 2, "transcript": "eu trabalhei", "end_of_turn": False,
               "turn_is_formatted": False}
    final = {**partial, "transcript": "Eu trabalhei.", "end_of_turn": True, "turn_is_formatted": True}
    unformatted_end = {**partial, "end_of_turn": True, "turn_is_formatted": False}
    assert parse_message(json.dumps(partial)) == TurnEvent(2, "eu trabalhei", False)
    assert parse_message(json.dumps(final)) == TurnEvent(2, "Eu trabalhei.", True)
    assert parse_message(json.dumps(unformatted_end)).is_final is False


def test_other_messages():
    assert parse_message(json.dumps({"type": "Begin", "id": "x"})) is None
    assert parse_message(json.dumps({"type": "Turn", "turn_order": 1, "transcript": ""})) is None
    assert parse_message(json.dumps({"type": "Termination"})) == "terminated"
    assert parse_message("não é json") is None
