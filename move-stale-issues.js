const github = require('@actions/github');
const util = require('util');

const isTTYout = Boolean(process.stdout.isTTY);
const labelInfo = isTTYout ? '\x1b[32m{info}\x1b[0m' : '';

const ts = () => `${(new Date()).toISOString()} ~ `;

const logger = {
    info(msg, context) {
        const params = [ labelInfo + ts() + msg ];

        if (context) {
            params.push(util.inspect(context));
        }

        params.push('');
        console.log(params.join(''));
    }
};

function getDaysDiff(startDate, endDate) {
    const dayInMs = 1000 * 60 * 60 * 24;

    const diffInMs = startDate.getTime() - endDate.getTime();
    const diffInDays = Math.round(diffInMs / dayInMs);

    return diffInDays;
}

async function runAction(config, context) {
    const {
        token,
        fromMilestone,
        targetMilestone,
        daysBeforeStale = 30,
        exemptAllAssignees = false
    } = config;

    logger.info('Starting action with params:');
    logger.info(`\tfromMilestone: ${fromMilestone}`);
    logger.info(`\ttargetMilestone: ${targetMilestone}`);
    logger.info(`\tdaysBeforeStale: ${daysBeforeStale}`);
    logger.info(`\texemptAllAssignees: ${exemptAllAssignees}`);
    logger.info(`\trepo owner: ${context.owner}`);
    logger.info(`\trepo: ${context.repo}`);

    const { repo, owner } = context;
    const octokit = github.getOctokit(token);

    logger.info('Trying to get milestones...');
    const { data: milestones } = await octokit.rest.issues.listMilestones({
        owner,
        repo,
        state: 'open'
    });

    const fromMilestoneIds = milestones.filter((m) =>
        fromMilestone.includes(m.title)
    ).map((m) => m.number);

    const targetMilestoneId = (milestones
        .find((m) => m.title === targetMilestone) || {}).number;

    if (!targetMilestoneId) {
        throw new Error(`Could not find target milestone: ${targetMilestone}`);
    }

    if (!fromMilestoneIds.length) {
        throw new Error('Could not find from milestone: ' +
            fromMilestone.join(' or '));
    }

    logger.info(`\tFrom milestone ids: #${fromMilestoneIds.join(', ')}`);
    logger.info(`\tTarget milestone id: #${targetMilestoneId}`);

    logger.info('Trying to get issues...');
    const opts = {
        owner,
        repo,
        state: 'open',
        milestone: fromMilestoneIds.join(',')
    };

    if (exemptAllAssignees) { opts.assignee = 'none'; }

    const now = new Date();
    let totalMoved = 0;

    const fn = octokit.rest.issues.listForRepo;
    for await (const response of octokit.paginate.iterator(fn, opts)) {
        const issue = response.data[0];
        const { number, updated_at, pull_request } = issue;

        if (pull_request) { continue; }

        const issueDate = new Date(updated_at);
        const diff = getDaysDiff(now, issueDate);

        logger.info(`\tLast update on issue #${number} was ${diff} days ago.`);
        if (daysBeforeStale === 0 || diff >= daysBeforeStale) {
            logger.info(`\t[stale] Issue #${number} is stale, moving...`);

            await octokit.rest.issues.update({
                owner,
                repo,
                issue_number: number,
                milestone: targetMilestoneId
            });

            logger.info(`\t[stale] Issue #${number} moved: ${targetMilestone}`);
            totalMoved++;
        } else {
            logger.info(`\t[not stale] Issue #${number} is NOT stale.`);
        }
    }

    logger.info('Done!');
    logger.info(`Total of issues moved: ${totalMoved}.`);
}

module.exports = { logger, getDaysDiff, runAction };
