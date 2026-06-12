import { Body, Param, Query } from '../../core/decorators/http-params.js'
import { Controller, Delete, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import { AgentOsService, type ZetroApiConnectionInput, type ZetroChatInput, type ZetroSearchInput } from './agent-os.service.js'

@Controller('api/v1/agent-os')
export class AgentOsController {
  constructor(@Inject(AgentOsService) private readonly agentOs: AgentOsService) {}

  @Get('status')
  status() {
    return this.agentOs.status()
  }

  @Get('read')
  read() {
    return this.agentOs.read()
  }

  @Get('api-connection')
  apiConnection() {
    return this.agentOs.apiConnection()
  }

  @Get('conversations')
  conversations(@Query() query: { limit?: number | string } | undefined) {
    return this.agentOs.conversations(query ?? {})
  }

  @Get('conversations/:uuid')
  conversation(@Param('uuid') uuid: string) {
    return this.agentOs.conversation(uuid)
  }

  @Delete('conversations/:uuid')
  clearConversation(@Param('uuid') uuid: string) {
    return this.agentOs.clearConversation(uuid)
  }

  @Delete('conversations')
  clearConversations() {
    return this.agentOs.clearConversations()
  }

  @Post('api-connection/test')
  testApiConnection(@Body() body: ZetroApiConnectionInput) {
    return this.agentOs.testApiConnection(body ?? {})
  }

  @Post('api-connection/save')
  saveApiConnection(@Body() body: ZetroApiConnectionInput) {
    return this.agentOs.saveApiConnection(body ?? {})
  }

  @Get('search')
  search(@Query() query: ZetroSearchInput) {
    return this.agentOs.search(query ?? {})
  }

  @Post('learn')
  learn(@Body() body: ZetroSearchInput) {
    return this.agentOs.learn(body ?? {})
  }

  @Post('chat')
  chat(@Body() body: ZetroChatInput) {
    return this.agentOs.chat(body ?? {})
  }
}
