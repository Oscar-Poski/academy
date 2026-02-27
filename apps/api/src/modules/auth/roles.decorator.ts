import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ROLES_KEY = 'required_roles';

export const Roles = (...roles: Array<'user' | 'admin'>) => SetMetadata(REQUIRED_ROLES_KEY, roles);
