import SNS from "aws-sdk/clients/sns";

export default class SNSClient {
  public readonly sns: SNS;
  private static instance: SNSClient;
  private constructor() {
    this.sns = new SNS();
  }

  public static getInstance(): SNSClient {
    if (!SNSClient.instance) {
      SNSClient.instance = new SNSClient();
    }

    return SNSClient.instance;
  }

  async publish(message: string, topicArn: string): Promise<void> {
    const params: SNS.PublishInput = {
      Message: message,
      TopicArn: topicArn,
    };

    await this.sns.publish(params).promise();
  }
}
