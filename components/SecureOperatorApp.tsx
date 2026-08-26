'use client';

import { AuthGate } from './AuthGate';
import { OperatorApp } from './OperatorApp';

export function SecureOperatorApp(){
  return <AuthGate><OperatorApp/></AuthGate>;
}
