const { getDaysDiff, runAction } = require('./move-stale-issues');
const github = require('@actions/github');

const assert = require('assert');

describe('Move Stale Issues', () => {
    const token = process.env.REPO_TOKEN;
    const repo = process.env.REPO_NAME;
    const owner = process.env.REPO_OWNER;

    it('getDaysDiff', () => {
        const now = new Date();
        const nextDay = new Date();

        nextDay.setDate(now.getDate() + 1);

        assert.strictEqual(getDaysDiff(nextDay, now), 1);
        assert.strictEqual(getDaysDiff(now, nextDay), -1);

        const oneWeek = new Date();
        oneWeek.setDate(now.getDate() + 7);

        assert.strictEqual(getDaysDiff(oneWeek, now), 7);
        assert.strictEqual(getDaysDiff(now, oneWeek), -7);
    });

    it('runAction with exempt-all-assignees false', async() => {
        const fromMilestone = `From Test Milestone ${new Date().getTime()}`;
        const targetMilestone = `Target Test Milestone ${new Date().getTime()}`;

        const octokit = github.getOctokit(token);

        await octokit.rest.issues
            .createMilestone({ owner, repo, title: fromMilestone });

        await octokit.rest.issues
            .createMilestone({ owner, repo, title: targetMilestone });

        const { data: milestones } = await octokit.rest.issues.listMilestones({
            owner,
            repo,
            state: 'open'
        });

        const fromMilestoneResponse = milestones
            .find((m) => m.title === fromMilestone);

        const targetMilestoneResponse = milestones
            .find((m) => m.title === targetMilestone);

        await octokit.rest.issues.create({
            owner,
            repo,
            title: 'Test case issue',
            milestone: fromMilestoneResponse.number
        });

        await runAction({
            token,
            fromMilestone,
            targetMilestone,
            daysBeforeStale: 0
        }, { repo, owner });

        await octokit.rest.issues.updateMilestone({
            owner,
            repo,
            state: 'closed',
            milestone_number: fromMilestoneResponse.number
        });

        await octokit.rest.issues.updateMilestone({
            owner,
            repo,
            state: 'closed',
            milestone_number: targetMilestoneResponse.number
        });

        const { data: issuesInTarget } = await octokit.rest.issues.listForRepo({
            owner,
            repo,
            state: 'open',
            milestone: targetMilestoneResponse.number
        });

        const { data: issuesInFrom } = await octokit.rest.issues.listForRepo({
            owner,
            repo,
            state: 'open',
            milestone: fromMilestoneResponse.number
        });

        assert.strictEqual(issuesInTarget.length, 1);
        assert.strictEqual(issuesInFrom.length, 0);

        for (const issue of issuesInTarget) {
            await octokit.rest.issues.update({
                owner,
                repo,
                issue_number: issue.number,
                state: 'closed'
            });

        }
    });

    it('runAction with exempt-all-assignees true', async() => {
        const fromMilestone = `From Test Milestone ${new Date().getTime()}`;
        const targetMilestone = `Target Test Milestone ${new Date().getTime()}`;

        const octokit = github.getOctokit(token);

        await octokit.rest.issues
            .createMilestone({ owner, repo, title: fromMilestone });

        await octokit.rest.issues
            .createMilestone({ owner, repo, title: targetMilestone });

        const { data: milestones } = await octokit.rest.issues.listMilestones({
            owner,
            repo,
            state: 'open'
        });

        const fromMilestoneResponse = milestones
            .find((m) => m.title === fromMilestone);

        const targetMilestoneResponse = milestones
            .find((m) => m.title === targetMilestone);

        await octokit.rest.issues.create({
            owner,
            repo,
            title: 'Test case issue',
            milestone: fromMilestoneResponse.number,
            assignees: [ 'Deividy' ]
        });

        await octokit.rest.issues.create({
            owner,
            repo,
            title: 'Test case issue',
            milestone: fromMilestoneResponse.number
        });

        await runAction({
            token,
            fromMilestone,
            targetMilestone,
            daysBeforeStale: 0,
            exemptAllAssignees: true
        }, { repo, owner });

        const { data: issuesInTarget } = await octokit.rest.issues.listForRepo({
            owner,
            repo,
            state: 'open',
            milestone: targetMilestoneResponse.number
        });

        const { data: issuesInFrom } = await octokit.rest.issues.listForRepo({
            owner,
            repo,
            state: 'open',
            milestone: fromMilestoneResponse.number
        });

        await octokit.rest.issues.deleteMilestone({
            owner,
            repo,
            milestone_number: fromMilestoneResponse.number
        });

        await octokit.rest.issues.deleteMilestone({
            owner,
            repo,
            milestone_number: targetMilestoneResponse.number
        });

        assert.strictEqual(issuesInTarget.length, 1);
        assert.strictEqual(issuesInFrom.length, 1);

        for (const issue of issuesInFrom.concat(issuesInTarget)) {
            await octokit.rest.issues.update({
                owner,
                repo,
                issue_number: issue.number,
                state: 'closed'
            });

        }
    });
});
