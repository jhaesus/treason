var expect = require('expect.js');

var createGame = require('../game');
var createTestPlayer = require('../test-util/test-player');
var createAiPlayer = require('../ai-player');
var shared = require('../web/shared');
var stateNames = shared.states;

var AI_IDX = 0;
var OPPONENT_IDX = 1;

describe('AI', function () {
    var game;
    var aiPlayer;
    var testPlayer;

    beforeEach(function () {
        game = createGame();
        aiPlayer = createAiPlayer(game, {
            searchHorizon: 7,
            chanceToBluff: 1,
            randomSeed: 1 // Make AI decisions predictably random.
        });
        testPlayer = createTestPlayer(game);
        return testPlayer.getNextState();
    });

    describe('Given an AI with a duke vs an opponent with a captain', function () {
        beforeEach(function () {
            game._test_setInfluence(AI_IDX, 'duke');
            game._test_setInfluence(OPPONENT_IDX, 'captain');
            game._test_setCash(AI_IDX, 6);
            game._test_setCash(OPPONENT_IDX, 2);

            game._test_setTurnState({
                name: stateNames.START_OF_TURN,
                playerIdx: OPPONENT_IDX
            });
        });

        describe('When the opponent attempts to steal', function () {
            beforeEach(function () {
                testPlayer.command({
                    command: 'play-action',
                    action: 'steal',
                    target: AI_IDX
                });

                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.ACTION_RESPONSE);
                });
            });

            it('Then the AI should challenge, causing them to lose the game', function () {
                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.GAME_WON);
                    expect(state.state.playerIdx).to.be(OPPONENT_IDX);
                });
            });
        });
    });

    describe('Given an AI with a duke vs an opponent with a captain, and the endgame is a long way off', function () {
        beforeEach(function () {
            game._test_setInfluence(AI_IDX, 'duke', 'duke');
            game._test_setInfluence(OPPONENT_IDX, 'captain', 'captain');
            game._test_setCash(AI_IDX, 6);
            game._test_setCash(OPPONENT_IDX, 2);

            game._test_setTurnState({
                name: stateNames.START_OF_TURN,
                playerIdx: OPPONENT_IDX
            });
        });

        describe('When the opponent attempts to steal', function () {
            beforeEach(function () {
                testPlayer.command({
                    command: 'play-action',
                    action: 'steal',
                    target: AI_IDX
                });

                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.ACTION_RESPONSE);
                });
            });

            it('Then the AI should bluff captain/ambassador', function () {
                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.BLOCK_RESPONSE);
                    expect(state.state.blockingRole).to.be('ambassador');
                    expect(state.state.playerIdx).to.be(OPPONENT_IDX);
                });
            });
        });
    });

    describe('Given an AI attempts a steal that will win the game', function () {
        beforeEach(function () {
            game._test_setInfluence(AI_IDX, 'captain');
            game._test_setInfluence(OPPONENT_IDX, 'contessa');
            game._test_setCash(AI_IDX, 6);
            game._test_setCash(OPPONENT_IDX, 6);

            game._test_setTurnState({
                name: stateNames.ACTION_RESPONSE,
                playerIdx: AI_IDX,
                action: 'steal',
                target: OPPONENT_IDX
            });
        });

        describe('When the opponent attempts to block', function () {
            beforeEach(function () {
                testPlayer.command({
                    command: 'block',
                    blockingRole: 'ambassador'
                });

                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.BLOCK_RESPONSE);
                });
            });

            it('Then the AI should challenge, and win', function () {
                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.GAME_WON);
                    expect(state.state.playerIdx).to.be(AI_IDX);
                });
            });
        });
    });

    describe('Given the AI attempts a steal, and the endgame is some way off', function () {
        beforeEach(function () {
            game._test_setInfluence(AI_IDX, 'captain');
            game._test_setInfluence(OPPONENT_IDX, 'contessa');
            game._test_setCash(AI_IDX, 2);
            game._test_setCash(OPPONENT_IDX, 2);

            game._test_setTurnState({
                name: stateNames.ACTION_RESPONSE,
                playerIdx: AI_IDX,
                action: 'steal',
                target: OPPONENT_IDX
            });
        });

        describe('When the opponent attempts to block', function () {
            beforeEach(function () {
                testPlayer.command({
                    command: 'block',
                    blockingRole: 'ambassador'
                });

                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.BLOCK_RESPONSE);
                });
            });

            it('Then the AI should allow the block', function () {
                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.START_OF_TURN);
                    expect(state.state.playerIdx).to.be(OPPONENT_IDX);
                });
            });
        });
    });

    describe('Given the AI has no good roles, and the endgame is some way off', function () {
        beforeEach(function () {
            game._test_setInfluence(AI_IDX, 'contessa', 'contessa');
            game._test_setInfluence(OPPONENT_IDX, 'ambassador', 'ambassador');
            game._test_setCash(AI_IDX, 2);
            game._test_setCash(OPPONENT_IDX, 2);
        });

        describe('When it is the AI turn', function () {
            beforeEach(function () {
                game._test_setTurnState({
                    name: stateNames.START_OF_TURN,
                    playerIdx: AI_IDX
                }, true);

                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.START_OF_TURN);
                });
            });

            it('Then the AI should bluff duke and draw tax (random)', function () {
                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.ACTION_RESPONSE);
                    expect(state.state.playerIdx).to.be(AI_IDX);
                    expect(state.state.action).to.be('tax');
                });
            });
        });
    });

    describe('Given the AI has no good roles, and a bluff would win us the game', function () {
        beforeEach(function () {
            game._test_setInfluence(AI_IDX, 'contessa');
            game._test_setInfluence(OPPONENT_IDX, 'ambassador');
            game._test_setCash(AI_IDX, 5);
            game._test_setCash(OPPONENT_IDX, 5);
        });

        describe('When it is the AI turn', function () {
            beforeEach(function () {
                game._test_setTurnState({
                    name: stateNames.START_OF_TURN,
                    playerIdx: AI_IDX
                }, true);

                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.START_OF_TURN);
                });
            });

            it('Then the AI should exchange instead of bluffing a winning move', function () {
                return testPlayer.getNextState().then(function (state) {
                    expect(state.state.name).to.be(stateNames.ACTION_RESPONSE);
                    expect(state.state.playerIdx).to.be(AI_IDX);
                    expect(state.state.action).to.be('exchange');
                });
            });
        });
    });
});