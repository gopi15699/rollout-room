# Rollout Room

A mobile release room built on [Switch](https://github.com/sandbox-quantum/switch). In it, people and AI agents
handle a bad staged rollout of a mobile app together in one team chat channel.

## Why

A bad web deploy can be rolled back in minutes. A bad mobile release can't: once a version is installed, it stays
on people's phones until they update. So when a staged rollout goes wrong, the team has to:

1. halt it before it reaches more devices,
2. find the cause and ship a verified fix, and
3. have a person decide each step, because every change to the rollout is a release decision.

That work usually spans QA, release management and engineering, across dashboards, terminals and chat threads.
Rollout Room puts them, and the agents that do the legwork, in one channel.

## Who's in the room

| Who | Kind | Job |
|---|---|---|
| Rollout watcher | Agent | Watches the rollout's crash-free rate and raises the alarm |
| Crash triager | Agent | Finds the suspect commit, reproduces the crash on an iOS simulator and posts screenshots |
| Fixer | Agent | Fixes the bug on a branch, checks it on the simulator and tags the new version |
| Release agent | Agent | Halts or starts a rollout, but every command waits for the release manager's approval |
| QA | Person | Verifies the fix and passes it in the channel |
| Release manager | Person | The only one who can approve a change to the rollout |

All four agents are Claude Code agents run by Switch Console.

## How Switch is used

The project is a Switch template, [template/rollout-room.template.yaml](template/rollout-room.template.yaml).
Using it once in Switch Console creates the four agents, the private room and its Mattermost channel. Switch
provides:

- **One room for people and agents.** Everyone reads and posts in the same Mattermost channel, and agents hand
  work to each other by name (`@watcher`, `@triager`, `@fixer`, `@release`), through room aliases.
- **Approval cards as the release gate.** The release agent runs with `auto_mode: false`, so each store command
  stops at an approval card in the channel. Once answered, the card records who decided, for example "Chosen by
  @user from Mattermost."
- **Who an agent takes orders from.** The release agent uses `addressing: owner-agents`, so it acts for the release
  manager and the other agents, not for anyone else in the channel. In testing, QA's `@release halt 1.5.0` was
  refused, and so was an approval QA typed in reply to a card.
- **Roles.** `release-gate` is exclusive and held by the release agent. `triage` is held by the triager.
- **Room docs.** A release checklist is attached to the room, and the agents point out skipped steps.
- **Room documents.** The triager saves the post-mortem as a room document called "Post-mortem".
- **Attachments.** The triager and fixer post simulator screenshots in the channel.

Without Switch there's no shared room, no approval gate and no handover between agents, so the workflow stops
working.

## The flow

1. The release manager posts `@release start 1.5.0 at 20%` and presses **Allow once** on the card.
2. The release agent asks the watcher to watch 1.5.0. When the crash-free rate drops, the watcher posts an alert
   with the top crash and hands it to the triager.
3. The triager compares 1.5.0 with 1.4.0, reproduces the crash on the simulator as a guest and as
   a member, and posts both screenshots. It proposes a halt to `@release` and hands the bug to `@fixer`.
4. The release agent asks to halt 1.5.0, and the release manager approves it on the card.
5. The fixer makes the smallest fix, checks it on the simulator for both kinds of account, tags `v1.5.1` and asks
   QA to verify it.
6. QA passes it in the channel. The fixer merges it and tells `@release` the version and commit are ready.
7. The release manager posts `@release start 1.5.1 at 100%, commit <sha>` and approves the card.
8. The watcher reports recovery, including how many devices are still on the halted 1.5.0.
9. The release manager asks `@triager` for a post-mortem, which is saved as a room document.

## Run it yourself

This was built and tested on one Mac, with Switch Console 0.40.1 and its local Mattermost.

### You need

- macOS with Xcode, an iOS simulator runtime and CocoaPods
- Node.js and npm
- Docker Desktop
- [Switch Console](https://github.com/sandbox-quantum/switch), connected to a Mattermost server. The local
  Mattermost that Console sets up in Docker works.
- Claude Code, signed in, for the agents
- A second Mattermost account for QA, in the same team as you. The template's default name for it is `basket-qa`.

### Steps

1. Clone this repository.

   ```bash
   git clone https://github.com/gopi15699/rollout-room.git
   ```

2. Run the setup script.

   ```bash
   cd rollout-room && ./setup.sh
   ```

   It creates `~/.rollout-room`, with the app's repository, the store tools, the simulated store and a
   simulator build of the app. It also creates an iOS simulator called "Rollout Room". The first run builds the
   app, which takes several minutes. Run it again at any time to reset the demo.

3. In Switch Console, open **Templates**, choose **Import template** and pick
   `template/rollout-room.template.yaml`.
4. Choose **Use** on the Rollout Room template. Set the team name (letters, numbers and hyphens, starting with a
   letter) and the QA account, then choose **Create all**.
5. Open the new room. The kickoff message asks each agent to introduce itself and take its role.
6. Follow [the flow](#the-flow). Sign in to Mattermost as the QA account in a second browser to play QA.

The Metro bundler for the app uses port 8082. Set `METRO_PORT` before running `setup.sh` to change it.

## What's real and what's simulated

- **The bug is planted.** Basket, in [demo-app](demo-app), is a small Expo app written for this project. Version
  1.5.0 adds a delivery estimate at checkout that reads the user's address. Guests have no address, so checkout
  crashes for guests and works for members.
- **The store is simulated.** [tools/fake-store](tools/fake-store) stands in for an app store's staged rollout
  console. Its installs, crash-free rates and crash report come from [tools/scenario.json](tools/scenario.json),
  and nothing talks to a real store.
- **The rest is real.** The agents really clone the app, compare commits, run it on an iOS simulator, take
  screenshots, commit, tag and push the fix. The approval cards really block the store commands until a person
  answers them.
- **The agents can't see this project.** They work from a copy of the app's history in `~/.rollout-room/basket.git`,
  which contains only the app, so they can't read this README to find the bug.
- **One person can play both humans.** In testing, the same person played QA and the release manager, using two
  Mattermost accounts.

## What a test run showed

From a full run on Nov 4, 2026:

- The rollout was halted at 17,174 devices, out of a 20% target of 40,000.
- The fix reproduced clean for guests and members, and the commit the simulator ran was the one that was tagged
  and shipped.
- Once 1.5.1 started, 17,136 devices were still on 1.5.0, and two minutes later 16,137 still were. A halt stops the
  spread, but it doesn't fix the phones that already have the bad version.
- The agents took about 2 minutes from the approved start to asking for a halt, and about 3 minutes from the halt
  to a fix ready for QA.

## Limitations

- Only tested on one Mac. The script's first-time build hasn't been tested from a fresh clone.
- `basket-sim` opens the checkout screen but doesn't tap "Place order", so QA should do that before passing a fix.
- Agents can't see who answered an approval card, so the release manager says so when asking for the post-mortem.
- The release agent ignores QA by design. A real team might want QA to be able to raise a halt.

## Layout

| Path | What it is |
|---|---|
| [template/rollout-room.template.yaml](template/rollout-room.template.yaml) | The Switch template: four agents, the room, roles, the checklist and the kickoff |
| [setup.sh](setup.sh) | Prepares `~/.rollout-room` and the simulator, and resets the demo |
| [tools/fake-store](tools/fake-store) | The simulated store's command line tool |
| [tools/scenario.json](tools/scenario.json) | The numbers the simulated store uses |
| [tools/basket-sim](tools/basket-sim) | Runs a checkout of the app on the simulator and takes a screenshot |
| [demo-app](demo-app) | Basket, the Expo app. Tags `v1.4.0` (healthy) and `v1.5.0` (the bad release) |

Built during the WeMakeDevs "Flip the Switch" hackathon, Nov 2026, with help from AI coding tools.
