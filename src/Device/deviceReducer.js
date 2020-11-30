/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {
    getPersistedIsFavorite,
    getPersistedNickname,
    persistIsFavorite,
    persistNickname,
} from '../utils/persistentStore';
import { displayedDeviceName } from './deviceInfo/deviceInfo';
import {
    DEVICES_DETECTED,
    DEVICE_SELECTED,
    DEVICE_DESELECTED,
    DEVICE_SETUP_COMPLETE,
    DEVICE_SETUP_ERROR,
    DEVICE_SETUP_INPUT_REQUIRED,
    DEVICE_SETUP_INPUT_RECEIVED,
    DEVICE_FAVORITE_TOGGLED,
    DEVICE_NICKNAME_SET,
    DEVICE_NICKNAME_RESET,
    DEVICE_ARRIVED,
    DEVICE_LEFT,
} from './deviceActions';

const withPersistedData = devices =>
    devices.map(device => ({
        ...device,
        favorite: getPersistedIsFavorite(device.serialNumber),
        nickname: getPersistedNickname(device.serialNumber),
    }));

const bySerialNumber = devices => {
    const devicesBySerialNumber = {};
    devices.forEach(device => {
        devicesBySerialNumber[device.serialNumber] = device;
    });

    return devicesBySerialNumber;
};

const withUpdatedDevice = (state, serialNumber, updateToMergeIn) => ({
    ...state,
    devices: {
        ...state.devices,
        [serialNumber]: {
            ...state.devices[serialNumber],
            ...updateToMergeIn,
        },
    },
});

const removeDevice = (devices, deviceId) => {
    const filteredDevices = Object.values(devices).filter(
        d => d.deviceId !== deviceId
    );
    return bySerialNumber(withPersistedData(filteredDevices));
};

const noDialogShown = {
    isSetupDialogVisible: false,
    setupDialogText: null,
    setupDialogChoices: [],
};

const initialState = {
    devices: {},
    selectedSerialNumber: null,
    deviceInfo: null,
    isSetupWaitingForUserInput: false,
    ...noDialogShown,
};

export default (state = initialState, action) => {
    switch (action.type) {
        case DEVICES_DETECTED: {
            return {
                ...state,
                devices: bySerialNumber(withPersistedData(action.devices)),
            };
        }
        case DEVICE_ARRIVED: {
            return {
                ...state,
                devices: bySerialNumber(
                    withPersistedData([
                        ...Object.values(state.devices),
                        action.device,
                    ])
                ),
            };
        }
        case DEVICE_LEFT: {
            return {
                ...state,
                devices: removeDevice(state.devices, action.deviceId),
            };
        }
        case DEVICE_SELECTED:
            return {
                ...state,
                selectedSerialNumber: action.device.serialNumber,
            };
        case DEVICE_DESELECTED:
            return { ...state, selectedSerialNumber: null, deviceInfo: null };
        case DEVICE_SETUP_COMPLETE:
            return {
                ...state,
                ...noDialogShown,
                deviceInfo: action.device.deviceInfo,
            };
        case DEVICE_SETUP_ERROR:
            return {
                ...state,
                ...noDialogShown,
            };
        case DEVICE_SETUP_INPUT_REQUIRED:
            return {
                ...state,
                isSetupDialogVisible: true,
                isSetupWaitingForUserInput: true,
                setupDialogText: action.message,
                setupDialogChoices:
                    action.choices == null ? [] : [...action.choices],
            };
        case DEVICE_SETUP_INPUT_RECEIVED:
            return { ...state, isSetupWaitingForUserInput: false };
        case DEVICE_FAVORITE_TOGGLED: {
            const newFavoriteState = !state.devices[action.serialNumber]
                .favorite;

            persistIsFavorite(action.serialNumber, newFavoriteState);
            return withUpdatedDevice(state, action.serialNumber, {
                favorite: newFavoriteState,
            });
        }
        case DEVICE_NICKNAME_SET: {
            persistNickname(action.serialNumber, action.nickname);
            return withUpdatedDevice(state, action.serialNumber, {
                nickname: action.nickname,
            });
        }
        case DEVICE_NICKNAME_RESET: {
            persistNickname(action.serialNumber, '');
            return withUpdatedDevice(state, action.serialNumber, {
                nickname: '',
            });
        }
        default:
            return state;
    }
};

const sorted = devices =>
    [...devices].sort((a, b) => {
        if (a.favorite !== b.favorite) {
            return a.favorite ? -1 : 1;
        }

        return displayedDeviceName(a) < displayedDeviceName(b) ? -1 : 1;
    });

export const getDevice = serialNumber => state =>
    state.device?.devices[serialNumber];

export const sortedDevices = state =>
    sorted(Object.values(state.device.devices));

export const deviceIsSelected = state =>
    state.device?.selectedSerialNumber != null;

export const selectedDevice = state =>
    state.device.devices[state.device.selectedSerialNumber];

export const deviceInfo = state => state.device.deviceInfo;
export const selectedSerialNumber = state => state.device.selectedSerialNumber;
