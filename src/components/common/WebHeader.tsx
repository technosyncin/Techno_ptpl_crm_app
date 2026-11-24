import React from 'react';
import { Header, HeaderProps } from './Header';

export interface WebHeaderProps extends HeaderProps {}

export const WebHeader: React.FC<WebHeaderProps> = (props) => {
  return <Header {...props} />;
};
