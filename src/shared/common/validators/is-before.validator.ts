import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ name: 'isBefore', async: false })
export class IsBeforeConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: string, args: ValidationArguments) {
    const relatedPropertyName = args.constraints[0];
    const relatedValue = (args.object as any)[relatedPropertyName];

    if (!propertyValue || !relatedValue) {
      return true; // Let other validators handle missing values
    }

    const valueDate = new Date(propertyValue);
    const relatedDate = new Date(relatedValue);

    // Check if dates are valid
    if (Number.isNaN(valueDate.getTime()) || Number.isNaN(relatedDate.getTime())) {
      return true; // Let IsDateString handle invalid dates
    }

    return valueDate.getTime() < relatedDate.getTime();
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be before ${args.constraints[0]}`;
  }
}

export function IsBefore(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsBeforeConstraint,
    });
  };
}
