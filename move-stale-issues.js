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
        daysBeforeStale
    } = config;

    logger.info('Starting action with params:');
    logger.info(`\tfrom-milestone: ${fromMilestone}`);
    logger.info(`\ttarget-milestone: ${targetMilestone}`);
    logger.info(`\tdays-before-stale: ${daysBeforeStale}`);
    logger.info(`\trepo owner: ${context.owner}`);
    logger.info(`\trepo: ${context.repo}`);

    const { repo, owner } = context;
    const octokit = github.getOctokit(token);

    // find milestone id from and target
    // get issues from milestone/label
    // update every issue milestone

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
    const { data: issues } = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        milestone: fromMilestoneIds.join(',')
    });

    logger.info(`Found ${issues.length} issues, checking stale...`);

    const now = new Date();
    let totalMoved = 0;

    for (const issue of issues) {
        const { number, updated_at } = issue;

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
