# Move Stale Issues

This actions moves stales issues `from-milestone` to `target-milestone`.

This project is inspired by the https://github.com/actions/stale, but, since the `stale` action close issues and PRs, I decided to make a simpler action that only moves the stale issues.

---

## Config

| config | description | default |
| :------ | :- | :- |
| `repo-token` | The github token. `${{ secrets.GITHUB_TOKEN }}`) | *required |
| `from-milestone` | The milestone name that we will look for stale issues<br /> you can pass milestone separated by comma (Milestone1, Milestone2...) | *required |
| `target-milestone` | The milestone we will move the stale issues | *required |
| `days-before-stale` | Total of days we consider an issue stale<br />0 will move all issues `from-milestone` to `target-milestone` | 30 |
| `exempt-all-assignees` | Exempt all issues with assignees from stale | false |

---

## Workflow example
```yml
name: move-stale-issues

on:
  schedule:
    - cron: '30 1 * * *'

jobs:
  move-stale-issues:
    runs-on: ubuntu-latest
    steps:
      - uses: Deividy/move-stale-issues@v2.1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          from-milestone: WIP
          target-milestone: Backlog
          days-before-stale: 60
```
