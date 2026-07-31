import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAfter', async: false })
export class IsAfterConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: string, args: ValidationArguments) {
    const relatedPropertyName = args.constraints[0] as string;
    const relatedValue = args.object[relatedPropertyName as keyof typeof args.object];

    if (!propertyValue || !relatedValue) {
      return true; // Let other validators handle missing values
    }

    const valueDate = new Date(propertyValue);
    const relatedDate = new Date(relatedValue as string | number | Date);

    if (Number.isNaN(valueDate.getTime()) || Number.isNaN(relatedDate.getTime())) {
      return false;
    }

    return valueDate.getTime() > relatedDate.getTime();
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be after ${args.constraints[0]}`;
  }
}

export function IsAfter(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsAfterConstraint,
    });
  };
}
