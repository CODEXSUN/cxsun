import { Controller, Get, Post } from '../../server/src/core/decorators/controller.js'
import { Body } from '../../server/src/core/decorators/http-params.js'
import { Inject } from '../../server/src/core/decorators/inject.js'
import { CxSyncCloudEngine, type CxSyncCloudHandshakeInput } from './engines/cxsync-cloud.engine.js'

@Controller('api/v1/cxsync-cloud')
export class CxSyncCloudController {
  constructor(@Inject(CxSyncCloudEngine) private readonly engine: CxSyncCloudEngine) {}

  @Get('status')
  status() {
    return {
      ok: true,
      service: 'cxsync-cloud',
      status: this.engine.status(),
    }
  }

  @Get('handshake')
  async latestHandshake() {
    const handshake = await this.engine.latestHandshake()
    return {
      handshake,
      ok: true,
      service: 'cxsync-cloud',
    }
  }

  @Post('handshake')
  async recordHandshake(@Body() body: CxSyncCloudHandshakeInput) {
    const handshake = await this.engine.recordHandshake(body)
    return {
      handshake,
      ok: true,
      service: 'cxsync-cloud',
    }
  }
}
