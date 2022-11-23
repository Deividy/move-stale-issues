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

async function runAction(owner, repo, config) {
    const {
        token,
        fromMilestone,
        targetMilestone,
        daysBeforeStale = 30,
        exemptAllAssignees = false,
        closeIssuesInTargetIfStaleForDays = false
    } = config;

    logger.info('Starting action with params:');
    logger.info(`\tfromMilestone: ${fromMilestone}`);
    logger.info(`\ttargetMilestone: ${targetMilestone}`);
    logger.info(`\tdaysBeforeStale: ${daysBeforeStale}`);
    logger.info(`\texemptAllAssignees: ${exemptAllAssignees}`);
    logger.info('\tcloseIssuesInTargetIfStaleForDays: ' +
        closeIssuesInTargetIfStaleForDays);

    logger.info(`\trepo owner: ${owner}`);
    logger.info(`\trepo: ${repo}`);

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
        per_page: 100,
        milestone: fromMilestoneIds.join(',')
    };

    if (exemptAllAssignees) { opts.assignee = 'none'; }

    const now = new Date();
    let totalMoved = 0;

    const fn = octokit.rest.issues.listForRepo;
    const issuesToMove = [];

    for await (const response of octokit.paginate.iterator(fn, opts)) {
        const issues = response.data;

        for (const issue of issues) {
            const { number, updated_at, pull_request } = issue;
            if (pull_request) { continue; }

            const issueDate = new Date(updated_at);
            const diff = getDaysDiff(now, issueDate);

            logger.info(`\tLast update on issue #${number} was ${diff} days ago.`);
            if (daysBeforeStale === 0 || diff >= daysBeforeStale) {
                logger.info(`\t[stale] Issue #${number} is stale.`);
                issuesToMove.push(issue);

            } else {
                logger.info(`\t[not stale] Issue #${number} is NOT stale.`);
            }
        }
    }

    for (const issue of issuesToMove) {
        const { number } = issue;
        await octokit.rest.issues.update({
            owner,
            repo,
            issue_number: number,
            milestone: targetMilestoneId
        });

        logger.info(`\t[stale] Issue #${number} moved to: ${targetMilestone}`);
        totalMoved++;
    }

    let totalClosed = 0;
    if (closeIssuesInTargetIfStaleForDays !== false) {
        const fn = octokit.rest.issues.listForRepo;
        const issuesToClose = [];

        for await (const response of octokit.paginate.iterator(fn, {
            owner,
            repo,
            state: 'open',
            per_page: 100,
            milestone: targetMilestoneId
        })) {
            const issues = response.data;

            for (const issue of issues) {
                const { number, updated_at, pull_request } = issue;
                if (pull_request) { continue; }

                const issueDate = new Date(updated_at);
                const diff = getDaysDiff(now, issueDate);

                logger.info(`\tLast update on issue #${number} was ${diff} days ago.`);
                if (diff >= closeIssuesInTargetIfStaleForDays) {
                    logger.info(`\t[stale] {close} Issue #${number} is stale.`);
                    issuesToClose.push(issue);
                } else {
                    logger.info(`\t[not stale] Issue #${number} is NOT stale.`);
                }
            }

            for (const issue of issuesToClose) {
                const { number } = issue;
                await octokit.rest.issues.update({
                    owner,
                    repo,
                    issue_number: number,
                    state: 'closed'
                });

                logger.info(`\t[stale] Issue #${number} closed!`);
                totalClosed++;
            }
        }
    }

    logger.info('Done!');
    logger.info(`Total of issues moved: ${totalMoved}, ` +
        `total closed: ${totalClosed}.`);
}

module.exports = { logger, getDaysDiff, runAction };
