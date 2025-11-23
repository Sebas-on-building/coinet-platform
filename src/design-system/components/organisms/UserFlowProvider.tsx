import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserFlow =
  | 'login'
  | 'dashboard'
  | 'chart'
  | 'alert'
  | 'logout'
  | 'settings'
  | 'register'
  | 'forgot-password'
  | 'profile'
  | 'portfolio';

interface UserFlowContextType {
  flow: UserFlow;
  setFlow: (flow: UserFlow) => void;
  goTo: (flow: UserFlow) => void;
}

const UserFlowContext = createContext<UserFlowContextType | undefined>(undefined);

export const UserFlowProvider = ({ children, initialFlow = 'login' }: { children: ReactNode; initialFlow?: UserFlow }) => {
  const [flow, setFlow] = useState<UserFlow>(initialFlow);
  const goTo = (f: UserFlow) => setFlow(f);
  return (
    <UserFlowContext.Provider value={{ flow, setFlow, goTo }}>
      {children}
    </UserFlowContext.Provider>
  );
};

export const useUserFlow = () => {
  const ctx = useContext(UserFlowContext);
  if (!ctx) throw new Error('useUserFlow must be used within a UserFlowProvider');
  return ctx;
}; 