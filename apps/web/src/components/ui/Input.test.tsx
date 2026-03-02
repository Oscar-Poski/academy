import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renders label-input association', () => {
    render(<Input id="email" label="Email" />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'email');
  });

  it('wires hint and error text via aria-describedby', () => {
    render(<Input id="password" label="Password" hint="Use 8+ characters" error="Password too short" />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-describedby', 'password-hint password-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Use 8+ characters')).toBeInTheDocument();
    expect(screen.getByText('Password too short')).toBeInTheDocument();
  });

  it('forwards native props', () => {
    const onChange = vi.fn();
    render(<Input id="name" label="Name" type="text" value="Ada" onChange={onChange} />);

    const input = screen.getByLabelText('Name');
    expect(input).toHaveValue('Ada');
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.change(input, { target: { value: 'Alan' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
