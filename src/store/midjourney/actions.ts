import { applicationOperator, midjourneyOperator, serviceOperator } from '@/operators';
import { IMidjourneyState } from './models';
import { ActionContext } from 'vuex';
import { IRootState } from '../common/models';
import { IApplication, IApplicationType, ICredential, IMidjourneyConfig, IMidjourneyTask, IService } from '@/models';
import { Status } from '@/models/common';
import { MIDJOURNEY_SERVICE_ID } from '@/constants';
import { mergeAndSortLists } from '@/utils/merge';

export const resetAll = ({ commit }: ActionContext<IMidjourneyState, IRootState>): void => {
  commit('resetAll');
};

export const setTasksItems = ({ commit }: any, payload: IMidjourneyTask[]) => {
  commit('setTasksItems', payload);
};

export const setTasksTotal = ({ commit }: any, payload: number) => {
  commit('setTasksTotal', payload);
};

export const setCredential = async ({ commit }: any, payload: ICredential): Promise<void> => {
  console.debug(setCredential, 'set credential', payload);
  commit('setCredential', payload);
};

export const setConfig = ({ commit }: any, payload: IMidjourneyConfig) => {
  commit('setConfig', payload);
};

export const setMode = ({ commit }: any, payload: string) => {
  commit('setMode', payload);
};

export const setService = async ({ commit }: any, payload: IService): Promise<void> => {
  console.debug('set service', payload);
  commit('setService', payload);
};

export const setApplication = ({ commit }: any, payload: IApplication) => {
  commit('setApplication', payload);
  const credential = payload?.credentials?.find((credential) => credential?.host === window.location.origin);
  commit('setCredential', credential);
};

export const setApplications = ({ commit }: any, payload: IApplication[]) => {
  commit('setApplications', payload);
};

export const getApplications = async ({
  commit,
  state,
  rootState
}: ActionContext<IMidjourneyState, IRootState>): Promise<IApplication[]> => {
  console.debug('start to get applications for midjourney');
  return new Promise((resolve, reject) => {
    state.status.getApplications = Status.Request;
    applicationOperator
      .getAll({
        user_id: rootState?.user?.id,
        service_id: MIDJOURNEY_SERVICE_ID
      })
      .then((response) => {
        console.debug('get applications success', response?.data);
        state.status.getApplications = Status.Success;
        commit('setApplications', response.data.items);
        // check if there is any application with 'Period' type
        const application = response.data.items?.find((application) => application?.type === IApplicationType.PERIOD);
        const application2 = response.data.items?.find((application) => application?.type === IApplicationType.USAGE);
        if (application && application?.remaining_amount) {
          console.debug('set application with Period', application);
          commit('setApplication', application);
          const credential = application?.credentials?.find(
            (credential) => credential?.host === window.location.origin
          );
          console.debug('set credential with Period', application);
          commit('setCredential', credential);
        } else if (application2) {
          console.debug('set application with Usage', application2);
          commit('setApplication', application2);
          const credential = application2?.credentials?.find(
            (credential) => credential?.host === window.location.origin
          );
          console.debug('set credential with Usage', application);
          commit('setCredential', credential);
        } else {
          console.debug('set application with null', response.data.items?.[0]);
          commit('setApplication', response.data.items?.[0]);
        }
        resolve(response.data.items);
        console.debug('save application success', response.data.items[0]);
      })
      .catch((error) => {
        state.status.getApplications = Status.Error;
        reject(error);
      });
  });
};

export const setTasks = ({ commit }: any, payload: IMidjourneyTask[]) => {
  commit('setTasks', payload);
};

export const getService = async ({ commit, state }: ActionContext<IMidjourneyState, IRootState>): Promise<IService> => {
  return new Promise((resolve, reject) => {
    console.debug('start to get service for midjourney');
    state.status.getService = Status.Request;
    serviceOperator
      .get(MIDJOURNEY_SERVICE_ID)
      .then((response) => {
        state.status.getService = Status.Success;
        commit('setService', response.data);
        resolve(response.data);
      })
      .catch((error) => {
        state.status.getService = Status.Error;
        reject(error);
      });
  });
};

export const getTasks = async (
  { commit, state, rootState }: ActionContext<IMidjourneyState, IRootState>,
  {
    offset,
    limit,
    createdAtMin,
    createdAtMax
  }: { offset?: number; limit?: number; createdAtMin?: number; createdAtMax?: number }
): Promise<IMidjourneyTask[]> => {
  return new Promise((resolve, reject) => {
    console.debug('start to get tasks', offset, limit, createdAtMax, createdAtMin);
    const credential = state.credential;
    const token = credential?.token;
    if (!token) {
      return reject('no token');
    }
    midjourneyOperator
      .tasks(
        {
          userId: rootState?.user?.id,
          createdAtMin,
          createdAtMax,
          type: 'imagine'
        },
        {
          token
        }
      )
      .then((response) => {
        console.debug('get imagine tasks success', response.data.items);
        // merge with existing tasks
        const existingItems = state?.tasks?.items || [];
        console.debug('existing items', existingItems);
        const newItems = response.data.items || [];
        console.debug('new items', newItems);
        // sort and de-duplicate using created_at
        const mergedItems = mergeAndSortLists(existingItems, newItems);
        commit('setTasksItems', mergedItems);
        commit('setTasksTotal', response.data.count);
        resolve(response.data.items);
      })
      .catch((error) => {
        return reject(error);
      });
  });
};

export default {
  setService,
  getService,
  resetAll,
  setCredential,
  setConfig,
  setMode,
  setApplication,
  setApplications,
  getApplications,
  setTasks,
  getTasks
};
