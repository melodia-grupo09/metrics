import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { UserMetricsConsumer } from './user-metrics.consumer';
import { UserMetric, UserEventType } from '../entities/user-metric.entity';

// Mock amqp-connection-manager
jest.mock('amqp-connection-manager', () => {
  const mockChannelWrapper = {
    addSetup: jest.fn().mockResolvedValue(undefined),
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mockConnection = {
    createChannel: jest.fn().mockReturnValue(mockChannelWrapper),
  };

  return {
    connect: jest.fn().mockReturnValue(mockConnection),
  };
});

describe('UserMetricsConsumer', () => {
  let consumer: UserMetricsConsumer;
  let mockUserModel: any;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    const createMockModel = () => {
      const model: any = jest.fn().mockImplementation((dto: any) => ({
        ...dto,
        save: jest.fn().mockResolvedValue(dto),
      }));
      return model;
    };

    mockUserModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserMetricsConsumer,
        {
          provide: getModelToken(UserMetric.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    consumer = module.get<UserMetricsConsumer>(UserMetricsConsumer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleUserEvent', () => {
    const createMockMessage = (content: any) =>
      ({
        content: Buffer.from(JSON.stringify(content)),
      }) as any;

    it('should record user registration event', async () => {
      const userId = 'test-user-id';
      const metadata = { email: 'test@example.com' };
      const timestamp = new Date();

      const message = createMockMessage({
        userId,
        eventType: UserEventType.REGISTRATION,
        metadata,
        timestamp,
      });

      await consumer.handleUserEvent(message);

      expect(mockUserModel).toHaveBeenCalledWith({
        userId,
        eventType: UserEventType.REGISTRATION,
        metadata,
        timestamp: expect.any(String),
      });
    });

    it('should record user login event', async () => {
      const userId = 'test-user-id';
      const metadata = { sessionId: 'session123' };
      const timestamp = new Date();

      const message = createMockMessage({
        userId,
        eventType: UserEventType.LOGIN,
        metadata,
        timestamp,
      });

      await consumer.handleUserEvent(message);

      expect(mockUserModel).toHaveBeenCalledWith({
        userId,
        eventType: UserEventType.LOGIN,
        metadata,
        timestamp: expect.any(String),
      });
    });

    it('should record user activity event', async () => {
      const userId = 'test-user-id';
      const metadata = { action: 'play_song' };
      const timestamp = new Date();

      const message = createMockMessage({
        userId,
        eventType: UserEventType.ACTIVITY,
        metadata,
        timestamp,
      });

      await consumer.handleUserEvent(message);

      expect(mockUserModel).toHaveBeenCalledWith({
        userId,
        eventType: UserEventType.ACTIVITY,
        metadata,
        timestamp: expect.any(String),
      });
    });

    it('should handle missing metadata gracefully', async () => {
      const userId = 'test-user-id';
      const timestamp = new Date();

      const message = createMockMessage({
        userId,
        eventType: UserEventType.LOGIN,
        timestamp,
      });

      await consumer.handleUserEvent(message);

      expect(mockUserModel).toHaveBeenCalledWith({
        userId,
        eventType: UserEventType.LOGIN,
        metadata: {},
        timestamp: expect.any(String),
      });
    });

    it('should handle missing timestamp gracefully', async () => {
      const userId = 'test-user-id';
      const metadata = { test: 'data' };

      const message = createMockMessage({
        userId,
        eventType: UserEventType.ACTIVITY,
        metadata,
      });

      await consumer.handleUserEvent(message);

      expect(mockUserModel).toHaveBeenCalledWith({
        userId,
        eventType: UserEventType.ACTIVITY,
        metadata,
        timestamp: expect.any(Date),
      });
    });

    it('should handle processing errors gracefully', async () => {
      const userId = 'test-user-id';

      // Mock constructor to throw an error
      mockUserModel.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const message = createMockMessage({
        userId,
        eventType: UserEventType.LOGIN,
        metadata: {},
        timestamp: new Date(),
      });

      // Should not throw, but handle error internally
      await expect(consumer.handleUserEvent(message)).resolves.not.toThrow();
    });
  });
});
