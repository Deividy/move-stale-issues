# Move Stale Issues
[![sheriff](https://github.com/Deividy/move-stale-issues/actions/workflows/sheriff.yml/badge.svg)](https://github.com/Deividy/move-stale-issues/actions/workflows/sheriff.yml)

[![NPM](https://nodei.co/npm/move-stale-issues.png?mini=true)](https://www.npmjs.com/package/move-stale-issues)


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

## Using with Node.js

You can also use this action in your node.js app:

```shell
npm install move-stale-issues
```

```javascript
const { runAction } = require('move-stale-issues');

(async () => {
  await runAction('repo-owner', 'repo-name', {
    token: 'PAT',
    fromMilestone: 'From name',
    targetMilestone: 'Target name',
    daysBeforeStale: 30
  });
```

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
      - uses: Deividy/move-stale-issues@v3.1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          from-milestone: WIP
          target-milestone: Backlog
          days-before-stale: 60
```
