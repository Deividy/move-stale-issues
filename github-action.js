const github = require('@actions/github');

const core = require('@actions/core');
const { runAction } = require('./move-stale-issues');

async function run() {
    const token = core.getInput('repo-token');

    const targetMilestone = core.getInput('target-milestone');
    const fromMilestone = core.getInput('from-milestone');
    const daysBeforeStale = core.getInput('days-before-stale') || 30;
    const exemptAllAssignees = core.getInput('exempt-all-assignees') &&
       core.getInput('exempt-all-assignees') !== 'false';

    if (!fromMilestone || !targetMilestone || !token) {
        throw new Error('repo-token, label-name, target-milestone are required');
    }

    const config = {
        token,
        targetMilestone,
        exemptAllAssignees,
        daysBeforeStale: Number(daysBeforeStale),
        fromMilestone: fromMilestone.split(',')
    };

    const { repo, owner } = github.context.repo;
    await runAction(owner, repo, config);
}

(async() => {
    try {
        await run();
    } catch (ex) {
        console.error(ex);
        process.exit(1);
    }
})();
