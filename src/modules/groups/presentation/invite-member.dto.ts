import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isEmail,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ name: 'isEmailOrUsername', async: false })
export class IsEmailOrUsernameConstraint implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    if (typeof text !== 'string') return false;
    if (text.includes('@')) {
      return isEmail(text);
    }
    return /^[a-z0-9_]+$/.test(text);
  }

  defaultMessage(args: ValidationArguments) {
    return '$property must be a valid email address or a valid username (lowercase letters, numbers, and underscores only)';
  }
}

export function IsEmailOrUsername(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEmailOrUsernameConstraint,
    });
  };
}

export class InviteMemberDto {
  @ApiProperty({ description: 'Email or Username of the user to invite' })
  @IsNotEmpty()
  @IsEmailOrUsername()
  identifier: string;
}
