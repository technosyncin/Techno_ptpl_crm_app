import React from 'react';
import { LeadsListScreen } from './LeadsListScreen';

interface AddEditLeadScreenProps {
  route: any;
  navigation: any;
}

export const AddEditLeadScreen: React.FC<AddEditLeadScreenProps> = (props) => {
  return <LeadsListScreen {...props} />;
};
