declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { ComponentType } from 'react';

  export interface MaterialCommunityIconsProps {
    name: string;
    color?: string;
    size?: number;
  }

  const MaterialCommunityIcons: ComponentType<MaterialCommunityIconsProps>;
  export default MaterialCommunityIcons;
}
