# 156 — CSP enforced

**What to build:** Switch the Content-Security-Policy header from report-only mode to enforced mode. The browser now blocks any resources that violate the policy.

**Blocked by:** 155

**Status:** todo

- [ ] Content-Security-Policy header is switched from report-only to enforced mode
- [ ] The policy string is the same as in report-only mode
- [ ] The browser blocks resources that violate the policy
- [ ] All legitimate features still work (no regressions from the testing phase)
- [ ] Works on the live URL
