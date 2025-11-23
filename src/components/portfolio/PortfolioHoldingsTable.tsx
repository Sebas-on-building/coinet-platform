import React from 'react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';

interface Holding {
  id: string;
  symbol: string;
  amount: number;
  price: number;
}

interface Props {
  holdings: Holding[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const PortfolioHoldingsTable: React.FC<Props> = ({ holdings, onEdit, onDelete }) => (
  <Card elevation="md">
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Amount</th>
          <th>Price</th>
          <th>Value</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {holdings.map(h => (
          <tr key={h.id}>
            <td>{h.symbol}</td>
            <td>{h.amount}</td>
            <td>${h.price.toFixed(2)}</td>
            <td>${(h.amount * h.price).toFixed(2)}</td>
            <td>
              <Button size="sm" variant="secondary" onClick={() => onEdit(h.id)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(h.id)} style={{ marginLeft: 8 }}>Delete</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
); 