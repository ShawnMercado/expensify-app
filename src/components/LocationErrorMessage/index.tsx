import React from 'react';
import {Linking} from 'react-native';
import CONST from '@src/CONST';
import BaseLocationErrorMessage from './BaseLocationErrorMessage';
import LocationErrorMessagePropTypes from './types';

/** Opens expensify help site in a new browser tab */
const navigateToExpensifyHelpSite = (): void => {
    Linking.openURL(CONST.NEWHELP_URL);
};

function LocationErrorMessage(props: LocationErrorMessagePropTypes) {
    console.log('testing ', props);

    return (
        <BaseLocationErrorMessage
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            onAllowLocationLinkPress={navigateToExpensifyHelpSite}
        />
    );
}

LocationErrorMessage.displayName = 'LocationErrorMessage';
export default LocationErrorMessage;
