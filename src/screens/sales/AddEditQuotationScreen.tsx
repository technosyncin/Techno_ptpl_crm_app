import React from 'react';
import { QuotationFormScreen } from './QuotationFormScreen';

interface AddEditQuotationScreenProps {
  route: any;
  navigation: any;
}

export const AddEditQuotationScreen: React.FC<
  AddEditQuotationScreenProps
> = ({ route, navigation }) => {
  return (
    <QuotationFormScreen
      route={route}
      navigation={navigation}
    />
  );
};