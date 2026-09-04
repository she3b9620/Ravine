# RAVINE — Vercel Deployment Recovery

## Current finding

The RAVINE Vercel project is currently not live and its latest deployment is failing before a successful build. Earlier Vercel/GitHub status explicitly reported a deployment/build rate-limit condition.

## Likely Hobby-plan constraint

Vercel documents deployment-disabled/blocked states as potentially caused by exceeded usage limits or plan restrictions. Recent Vercel community reports also confirm that Hobby accounts are limited to 100 deployments per day, including preview deployments, and that hitting this limit can surface as a deployment rate-limit status and recover after the limit window resets.

## Recovery procedure

1. Do not change `main` or Production while recovering the feature branch.
2. Stop unnecessary preview deployments and avoid repeated pushes while the limit is active.
3. Wait for the account deployment window to reset, then create one fresh deployment for `ravine/clean-rebuild`.
4. Prefer a single fresh commit/deployment after the reset rather than multiple test commits.
5. If deployment remains blocked after the limit window, check Vercel Project Settings and account usage/billing for a project/team pause or another deployment restriction.
6. If necessary, use Vercel CLI from the repository because CLI deployment can expose validation errors that the Git-triggered path may not surface clearly.

## RAVINE-specific state

The latest code fixes after the older failed deployment are on `ravine/clean-rebuild`. The deployment list still shows the older error deployment because Vercel has not produced a new successful build for the newer commits.

## Important

Do not treat `upgrade to Pro` as the only fix. A Hobby deployment-rate limit can recover when the deployment window resets. Upgrading is an option, but it is not required to continue development on the branch if the account becomes deployable again after the limit clears.
