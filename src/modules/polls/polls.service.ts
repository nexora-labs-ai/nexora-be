import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { PollStatus } from '@prisma/client';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../shared/common/domain-errors';
import { CreatePollDto } from './dto/create-poll.dto';

@Injectable()
export class PollsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGroupPolls(groupId: string) {
    return this.prisma.poll.findMany({
      where: { groupId },
      include: {
        options: {
          include: { _count: { select: { votes: true } } },
        },
        _count: { select: { options: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPoll(groupId: string, dto: CreatePollDto) {
    return this.prisma.poll.create({
      data: {
        groupId,
        question: dto.question,
        description: dto.description,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        options: {
          createMany: {
            data: dto.options.map((text: string, index: number) => ({ text, order: index })),
          },
        },
      },
      include: { options: true },
    });
  }

  async vote(pollId: string, optionId: string, userId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!poll) throw new NotFoundError('Poll', pollId);
    if (poll.status !== PollStatus.ACTIVE) {
      throw new BusinessRuleError('This poll is no longer active');
    }
    if (poll.expiresAt && poll.expiresAt < new Date()) {
      throw new BusinessRuleError('This poll has expired');
    }
    if (!poll.options.some((o: { id: string }) => o.id === optionId)) {
      throw new NotFoundError('Poll option', optionId);
    }

    // Check if already voted
    const existingVote = await this.prisma.pollVote.findFirst({
      where: {
        userId,
        option: { pollId },
      },
    });

    if (existingVote) {
      throw new ConflictError('You have already voted in this poll');
    }

    return this.prisma.pollVote.create({
      data: { optionId, userId },
    });
  }

  async closePoll(pollId: string) {
    return this.prisma.poll.update({
      where: { id: pollId },
      data: { status: PollStatus.CLOSED },
    });
  }
}
