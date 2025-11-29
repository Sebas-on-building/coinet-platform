import React from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.32);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const ModalBox = styled.div`
  background: var(--color-surface);
  border-radius: 24px;
  box-shadow: 0 8px 32px #00ffa355, 0 1.5px 8px #0002;
  padding: 40px 32px;
  min-width: 320px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  position: relative;
`;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <Overlay onClick={onClose}>
      <ModalBox onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {children}
      </ModalBox>
    </Overlay>
  );
}; 