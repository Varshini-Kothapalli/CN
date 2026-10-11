from typing import Dict, Any, List
from backend.models import DiagnosticReport, ComparisonReport


def compare_diagnostic_sessions(before: DiagnosticReport, after: DiagnosticReport) -> ComparisonReport:
    """
    Compares two diagnostic sessions (e.g. before fixing in Packet Tracer vs after fixing).
    Evaluates test score diffs and assigns recovery verification status:
      - RECOVERED
      - PARTIALLY_RECOVERED
      - UNRESOLVED
      - REGRESSED
    """
    test_differences: List[Dict[str, Any]] = []

    all_keys = set(before.individual_tests.keys()).union(set(after.individual_tests.keys()))
    improved_count = 0
    worsened_count = 0

    for key in sorted(all_keys):
        b_val = before.individual_tests.get(key, "NOT_RECORDED")
        a_val = after.individual_tests.get(key, "NOT_RECORDED")

        status_change = "SAME"
        if b_val != a_val:
            if b_val == "FAIL" and a_val == "PASS":
                status_change = "IMPROVED"
                improved_count += 1
            elif b_val == "PASS" and a_val == "FAIL":
                status_change = "WORSENED"
                worsened_count += 1
            else:
                status_change = "CHANGED"

            test_differences.append({
                "test_name": key,
                "before_result": b_val,
                "after_result": a_val,
                "change": status_change
            })

    # Evaluate overall status change
    b_stat = before.overall_status
    a_stat = after.overall_status

    if a_stat == "HEALTHY" and b_stat in ["FAULT DETECTED", "POSSIBLE FAULT"]:
        recovery_status = "RECOVERED"
        overall_change = "IMPROVED"
        summary = (
            f"Recovery Verified! Network connectivity transitioned from '{b_stat}' to '{a_stat}'. "
            f"The previous fault ('{before.likely_cause}') appears successfully resolved in Packet Tracer."
        )
    elif improved_count > 0 and a_stat != "HEALTHY":
        recovery_status = "PARTIALLY_RECOVERED"
        overall_change = "IMPROVED"
        summary = (
            f"Partial Recovery: {improved_count} individual tests improved, but network status remains "
            f"'{a_stat}' due to ongoing issue: '{after.likely_cause}'."
        )
    elif worsened_count > 0 or (b_stat == "HEALTHY" and a_stat != "HEALTHY"):
        recovery_status = "REGRESSED"
        overall_change = "REGRESSED"
        summary = (
            f"Regression Detected: Network status changed from '{b_stat}' to '{a_stat}'. "
            f"New fault identified: '{after.likely_cause}'."
        )
    elif b_stat == a_stat and a_stat == "HEALTHY":
        recovery_status = "RECOVERED"
        overall_change = "UNCHANGED"
        summary = "Both sessions confirm HEALTHY network operation. Baseline performance is consistent."
    else:
        recovery_status = "UNRESOLVED"
        overall_change = "UNCHANGED"
        summary = (
            f"Unresolved: Fault condition persists across sessions. Both sessions reported '{b_stat}'. "
            f"Suspected cause remains: '{after.likely_cause}'."
        )

    return ComparisonReport(
        before_session=before,
        after_session=after,
        status_change=overall_change,
        recovery_verification_status=recovery_status,
        test_differences=test_differences,
        summary=summary
    )
