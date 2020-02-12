'use strict';
import {createLocalVue, mount} from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import {assert, config as chaiConfig} from 'chai';
import Vuex from 'vuex';
import ExecutionDetails from '../../js/history/execution-details'
import historyModule, {axiosInstance} from '../../js/history/executions-module';
import {vueTicks} from '../test_utils';


chaiConfig.truncateThreshold = 0;

const localVue = createLocalVue();
localVue.use(Vuex);

const axiosMock = new MockAdapter(axiosInstance);
const flushPromises = () => new Promise(resolve => setTimeout(resolve));


function mockGetExecution(id, startTime, user, script, status, exitCode, command, log) {
    axiosMock.onGet('history/execution_log/long/' + id)
        .reply(200, {
            id, startTime, user, script, status, exitCode, command, log
        });
}

describe('Test history details', function () {
    let executionDetails;
    let store;

    beforeEach(async function () {
        store = new Vuex.Store({
            modules: {
                history: historyModule()
            }
        });

        executionDetails = mount(ExecutionDetails, {
            attachToDocument: true,
            store,
            localVue
        });

        await vueTicks();
    });

    afterEach(function () {
        executionDetails.destroy();
    });

    describe('Test visualisation', function () {

            function assertField(fieldName, expectedValue) {
                const foundChild = executionDetails.vm.$children.find(child =>
                    (child.$options._componentTag === 'readonly-field')
                    && (child.$props.title === fieldName));

                assert.exists(foundChild, 'Failed to find field ' + fieldName);
                assert.equal(foundChild.$props.value, expectedValue);
            }

            function assertLog(expectedLog) {
                const actualLog = $(executionDetails.vm.$el).find('code').text();
                assert.equal(actualLog, expectedLog);
            }

            it('test null execution', function () {
                assertField('Script name', '');
                assertField('User', '');
                assertField('Start time', '');
                assertField('Status', '');
                assertField('Command', '');
                assertLog('');
            });

            it('test some execution', async function () {
                mockGetExecution('12345',
                    '2019-12-25T12:30:01',
                    'User X',
                    'My script',
                    'Finished',
                    -15,
                    'my_script.sh -a -b 2',
                    'some long log text');

                executionDetails.setProps({'executionId': 12345});

                await flushPromises();
                await vueTicks();

                assertField('Script name', 'My script');
                assertField('User', 'User X');
                assertField('Start time', '12/25/2019 12:30:01 PM');
                assertField('Status', 'Finished (-15)');
                assertField('Command', 'my_script.sh -a -b 2');
                assertLog('some long log text');
            });

            it('test some execution changed to null', async function () {
                mockGetExecution('12345',
                    '2019-12-25T12:30:01',
                    'User X',
                    'My script',
                    'Finished',
                    -15,
                    'my_script.sh -a -b 2',
                    'some long log text');

                executionDetails.setProps({'executionId': 12345});
                await flushPromises();
                await vueTicks();

                executionDetails.setProps({'executionId': null});

                await flushPromises();
                await vueTicks();

                assertField('Script name', '');
                assertField('User', '');
                assertField('Start time', '');
                assertField('Status', '');
                assertField('Command', '');
                assertLog('');
            });
        }
    )
});
