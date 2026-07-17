import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  MaxLength,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isEmail,
  registerDecorator,
} from 'class-validator';
import {
  USERNAME_INVALID_MESSAGE,
  USERNAME_REGEX,
} from '../../../shared/common/validators/validation.constants';

@ValidatorConstraint({ name: 'isEmailOrUsername', async: false })
export class IsEmailOrUsernameConstraint implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    if (typeof text !== 'string') return false;
    if (text.includes('@')) {
      return isEmail(text);
    }
    return USERNAME_REGEX.test(text);
  }

  defaultMessage(args: ValidationArguments) {
    return USERNAME_INVALID_MESSAGE;
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
  @MaxLength(255)
  identifier: string;
}
