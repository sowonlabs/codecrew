import { Logger } from '@nestjs/common';
import { CliOptions } from '../cli-options';
import { CodeCrewTool } from '../codecrew.tool';

const logger = new Logger('DoctorHandler');

/**
 * Handle doctor command: codecrew doctor
 * This will be implemented by the development team
 */
export async function handleDoctor(app: any, args: CliOptions) {
  logger.log('Doctor command received');

  try {
    // 1. Get CodeCrewTool from app context
    const codeCrewTool = app.get(CodeCrewTool);
    
    console.log('🩺 Checking AI Provider Status...');
    
    // 2. Call checkAIProviders method
    const result = await codeCrewTool.checkAIProviders();
    
    // 3. Format and output status
    if (result.success) {
      console.log(`✅ Found ${result.availableProviders?.length || 0} available AI providers`);
      if (result.availableProviders) {
        result.availableProviders.forEach((provider: string) => {
          console.log(`   • ${provider} CLI: Available`);
        });
      }
    } else {
      console.log('❌ AI provider check failed');
      console.log(`   Error: ${result.error}`);
    }
    
  } catch (error) {
    logger.error(`Doctor check failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}