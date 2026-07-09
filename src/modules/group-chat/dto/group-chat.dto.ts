import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class JoinChatDto {
  @IsNotEmpty()
  @IsUUID('4')
  groupId: string;
}

export class SendMessageDto {
  @IsNotEmpty()
  @IsUUID('4')
  groupId: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
