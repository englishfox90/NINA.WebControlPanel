import React, { useState, useEffect } from 'react';
import { Dialog, Button, Flex, Text, Box, Card, TextField, Badge, Callout, Code, Separator, Heading, Switch } from '@radix-ui/themes';
import { CheckIcon, CrossCircledIcon, ReloadIcon, InfoCircledIcon, RocketIcon } from '@radix-ui/react-icons';

interface OnboardingFlowProps {
    isOpen: boolean;
    onComplete: () => void;
}

interface NINAConnectionTest {
    connected: boolean;
    message: string;
    version?: string;
}

interface FileCheckResult {
    exists: boolean;
    message: string;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ isOpen, onComplete }) => {
    const [step, setStep] = useState(1);
    const [ninaIp, setNinaIp] = useState('127.0.0.1');
    const [ninaPort, setNinaPort] = useState('1888');
    const [ninaConnected, setNinaConnected] = useState<boolean | null>(null);
    const [testingConnection, setTestingConnection] = useState(false);
    const [schedulerPath, setSchedulerPath] = useState('%LOCALAPPDATA%\\NINA\\SchedulerPlugin\\schedulerdb.sqlite');
    const [schedulerFileExists, setSchedulerFileExists] = useState<boolean | null>(null);
    const [checkingFile, setCheckingFile] = useState(false);
    const [liveFeed1, setLiveFeed1] = useState('');
    const [liveFeed2, setLiveFeed2] = useState('');
    const [liveFeed3, setLiveFeed3] = useState('');
    const [localCameraPath, setLocalCameraPath] = useState('');
    const [useLocalCamera, setUseLocalCamera] = useState(false);
    const [isDevMode, setIsDevMode] = useState(false);

    // Load existing configuration when component opens
    useEffect(() => {
        if (isOpen) {
            loadExistingConfig();
        }
    }, [isOpen]);

    const loadExistingConfig = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/config');
            const config = await response.json();

            // Populate fields with existing values if they exist
            if (config.nina) {
                // Extract IP from baseUrl (e.g., "http://172.26.81.152/" -> "172.26.81.152")
                const baseUrl = config.nina.baseUrl || 'http://127.0.0.1/';
                const ipMatch = baseUrl.match(/https?:\/\/([^/:]+)/);
                if (ipMatch && ipMatch[1]) {
                    setNinaIp(ipMatch[1]);
                }
                if (config.nina.apiPort) {
                    setNinaPort(String(config.nina.apiPort));
                }
            }

            if (config.database?.targetSchedulerPath) {
                setSchedulerPath(config.database.targetSchedulerPath);
            }

            if (config.streams) {
                if (config.streams.liveFeed1) setLiveFeed1(config.streams.liveFeed1);
                if (config.streams.liveFeed2) setLiveFeed2(config.streams.liveFeed2);
                if (config.streams.liveFeed3) setLiveFeed3(config.streams.liveFeed3);
                if (config.streams.localCameraPath) {
                    setLocalCameraPath(config.streams.localCameraPath);
                    setUseLocalCamera(true);
                }
            }
        } catch (error) {
            console.error('Failed to load existing configuration:', error);
            // If loading fails, keep default values
        }
    };

    useEffect(() => {
        // Detect if running in development mode
        // Production: Built React app served from port 3001
        // Development: React dev server on port 3000, or NODE_ENV !== 'production'
        const isProductionBuild = process.env.NODE_ENV === 'production';
        const isDev = !isProductionBuild || (window.location.port === '3000');
        setIsDevMode(isDev);
    }, []);

    const testNINAConnection = async () => {
        setTestingConnection(true);
        try {
            const response = await fetch('http://localhost:3001/api/nina/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: ninaIp, port: parseInt(ninaPort) })
            });

            const result: NINAConnectionTest = await response.json();
            setNinaConnected(result.connected);
        } catch (error) {
            setNinaConnected(false);
        } finally {
            setTestingConnection(false);
        }
    };

    const checkSchedulerFile = async () => {
        setCheckingFile(true);
        setSchedulerFileExists(null);
        try {
            const response = await fetch('http://localhost:3001/api/scheduler/check-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: schedulerPath })
            });

            const result: FileCheckResult = await response.json();
            setSchedulerFileExists(result.exists);
        } catch (error) {
            setSchedulerFileExists(false);
        } finally {
            setCheckingFile(false);
        }
    };

    const handleBrowseSchedulerFile = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.sqlite,.db';
        input.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files[0]) {
                // For web file input, we can only get the name, not full path (security restriction)
                // User will need to paste full path or we rely on default location
                const fileName = target.files[0].name;
                setSchedulerPath(fileName);
                setSchedulerFileExists(null);
            }
        };
        input.click();
    };

    const saveConfiguration = async () => {
        try {
            const config = {
                nina: {
                    baseUrl: `http://${ninaIp}/`,
                    apiPort: parseInt(ninaPort),
                    timeout: 5000,
                    retryAttempts: 3,
                    guiderExposureDuration: 2.0
                },
                database: {
                    targetSchedulerPath: schedulerPath,
                    backupEnabled: true,
                    backupInterval: 24
                },
                streams: {
                    liveFeed1,
                    liveFeed2,
                    liveFeed3,
                    localCameraPath: useLocalCamera ? localCameraPath : '',
                    defaultStream: 1,
                    connectionTimeout: 10000
                },
                onboarding: {
                    completed: true,
                    completedAt: new Date().toISOString()
                }
            };

            await fetch('http://localhost:3001/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            onComplete();
        } catch (error) {
            console.error('Failed to save configuration:', error);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <Flex direction="column" gap="4">
                        <Flex align="center" gap="2">
                            <RocketIcon width="24" height="24" />
                            <Heading size="6">Welcome to NINA Web Control Panel!</Heading>
                        </Flex>

                        <Text size="3" color="gray">
                            Let's get your observatory dashboard set up in just a few steps.
                        </Text>

                        <Separator size="4" />

                        <Box>
                            <Heading size="4" mb="3">Requirements</Heading>

                            <Callout.Root color="blue" mb="3">
                                <Callout.Icon>
                                    <InfoCircledIcon />
                                </Callout.Icon>
                                <Callout.Text>
                                    <strong>NINA Requirements:</strong>
                                    <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                                        <li>NINA v2.0 or higher</li>
                                        <li>Advanced API must be enabled in NINA settings</li>
                                    </ul>
                                </Callout.Text>
                            </Callout.Root>

                            <Callout.Root color="green" mb="3">
                                <Callout.Icon>
                                    <CheckIcon />
                                </Callout.Icon>
                                <Callout.Text>
                                    <strong>Recommended Plugins:</strong>
                                    <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                                        <li><strong>Target Scheduler</strong> - For automated imaging sequences</li>
                                        <li><strong>Hocus Focus LiveStack</strong> - For real-time image stacking</li>
                                    </ul>
                                </Callout.Text>
                            </Callout.Root>

                            {isDevMode && (
                                <Callout.Root color="orange">
                                    <Callout.Icon>
                                        <InfoCircledIcon />
                                    </Callout.Icon>
                                    <Callout.Text>
                                        <strong>Development Mode Detected</strong>
                                        <br />
                                        When ready for production deployment, run:
                                        <Box mt="2" mb="2">
                                            <Code size="3">npm run deploy</Code>
                                        </Box>
                                        This will automatically build the frontend, configure the backend, and prepare everything for production use.
                                    </Callout.Text>
                                </Callout.Root>
                            )}
                        </Box>

                        <Flex gap="3" justify="end">
                            <Button size="3" onClick={() => setStep(2)}>
                                Next: Connect to NINA
                            </Button>
                        </Flex>
                    </Flex>
                );

            case 2:
                return (
                    <Flex direction="column" gap="4">
                        <Heading size="6">Connect to NINA</Heading>

                        <Text size="3" color="gray">
                            Enter your NINA installation details. The default port is 1888.
                        </Text>

                        <Separator size="4" />

                        <Box>
                            <Flex direction="column" gap="3">
                                <Box>
                                    <Text as="label" size="2" weight="bold" mb="1">
                                        IP Address
                                    </Text>
                                    <TextField.Root
                                        size="3"
                                        placeholder="127.0.0.1"
                                        value={ninaIp}
                                        onChange={(e) => setNinaIp(e.target.value)}
                                    />
                                    <Text size="1" color="gray" mt="1">
                                        Use 127.0.0.1 for local NINA, or the remote computer's IP address
                                    </Text>
                                </Box>

                                <Box>
                                    <Text as="label" size="2" weight="bold" mb="1">
                                        API Port
                                    </Text>
                                    <TextField.Root
                                        size="3"
                                        placeholder="1888"
                                        value={ninaPort}
                                        onChange={(e) => setNinaPort(e.target.value)}
                                    />
                                    <Text size="1" color="gray" mt="1">
                                        Default is 1888. Check NINA's Advanced API settings if unsure.
                                    </Text>
                                </Box>

                                <Button
                                    size="3"
                                    onClick={testNINAConnection}
                                    disabled={testingConnection}
                                    style={{ width: '100%' }}
                                >
                                    {testingConnection ? (
                                        <>
                                            <ReloadIcon className="spin" />
                                            Testing Connection...
                                        </>
                                    ) : (
                                        'Test Connection'
                                    )}
                                </Button>

                                {ninaConnected !== null && (
                                    <Callout.Root color={ninaConnected ? 'green' : 'red'}>
                                        <Callout.Icon>
                                            {ninaConnected ? <CheckIcon /> : <CrossCircledIcon />}
                                        </Callout.Icon>
                                        <Callout.Text>
                                            {ninaConnected
                                                ? 'Successfully connected to NINA!'
                                                : 'Failed to connect. Please check your IP address, port, and ensure NINA Advanced API is enabled.'}
                                        </Callout.Text>
                                    </Callout.Root>
                                )}
                            </Flex>
                        </Box>

                        <Flex gap="3" justify="between">
                            <Button variant="soft" onClick={() => setStep(1)}>
                                Back
                            </Button>
                            <Button
                                onClick={() => setStep(3)}
                                disabled={ninaConnected !== true}
                            >
                                Next: Configure Scheduler
                            </Button>
                        </Flex>
                    </Flex>
                );

            case 3:
                return (
                    <Flex direction="column" gap="4">
                        <Heading size="6">Target Scheduler Database</Heading>

                        <Text size="3" color="gray">
                            Configure the location of your NINA Target Scheduler database.
                        </Text>

                        <Separator size="4" />

                        <Box>
                            <Callout.Root color="blue" mb="3">
                                <Callout.Icon>
                                    <InfoCircledIcon />
                                </Callout.Icon>
                                <Callout.Text>
                                    <Box>
                                        <Text weight="bold" size="2">What is this?</Text>
                                        <Text size="2" style={{ display: 'block', marginTop: '4px' }}>
                                            The Target Scheduler plugin stores your imaging projects, targets, and exposure plans in a SQLite database.
                                            This dashboard reads that database to show your project progress and upcoming targets.
                                        </Text>

                                        <Text weight="bold" size="2" style={{ display: 'block', marginTop: '12px' }}>Typical Location:</Text>
                                        <Code size="1" style={{ display: 'block', marginTop: '4px', wordBreak: 'break-all' }}>
                                            %LOCALAPPDATA%\NINA\SchedulerPlugin\schedulerdb.sqlite
                                        </Code>
                                        <Text size="1" color="gray" style={{ display: 'block', marginTop: '4px' }}>
                                            (Expands to: <Code size="1" style={{ wordBreak: 'break-all' }}>C:\Users\YourName\AppData\Local\NINA\SchedulerPlugin\schedulerdb.sqlite</Code>)
                                        </Text>
                                    </Box>
                                </Callout.Text>
                            </Callout.Root>                            <Box mb="3">
                                <Text as="label" size="2" weight="bold" mb="1">
                                    Scheduler Database Path
                                </Text>
                                <Flex gap="2" mb="2">
                                    <Box style={{ flex: 1 }}>
                                        <TextField.Root
                                            size="3"
                                            value={schedulerPath}
                                            onChange={(e) => {
                                                setSchedulerPath(e.target.value);
                                                setSchedulerFileExists(null);
                                            }}
                                            style={{ fontFamily: 'monospace' }}
                                            placeholder="Paste path or use Browse button"
                                        />
                                    </Box>
                                    <Button
                                        size="3"
                                        variant="soft"
                                        onClick={handleBrowseSchedulerFile}
                                    >
                                        Browse...
                                    </Button>
                                </Flex>

                                <Flex gap="2" mb="2">
                                    <Button
                                        size="2"
                                        variant="surface"
                                        onClick={checkSchedulerFile}
                                        disabled={checkingFile || !schedulerPath}
                                        style={{ width: '100%' }}
                                    >
                                        {checkingFile ? (
                                            <>
                                                <ReloadIcon className="spin" />
                                                Checking File...
                                            </>
                                        ) : (
                                            'Verify File Exists'
                                        )}
                                    </Button>
                                </Flex>

                                {schedulerFileExists !== null && (
                                    <Callout.Root color={schedulerFileExists ? 'green' : 'amber'} size="1">
                                        <Callout.Icon>
                                            {schedulerFileExists ? <CheckIcon /> : <InfoCircledIcon />}
                                        </Callout.Icon>
                                        <Callout.Text>
                                            {schedulerFileExists
                                                ? 'Database file found! Scheduler features will be available.'
                                                : 'File not found. Scheduler features will be disabled until the database is available. You can configure this later in Settings.'}
                                        </Callout.Text>
                                    </Callout.Root>
                                )}

                                <Text size="1" color="gray" mt="2">
                                    💡 Don't have Target Scheduler yet? You can skip this and configure it later when you install the plugin.
                                </Text>
                            </Box>
                        </Box>

                        <Flex gap="3" justify="between">
                            <Button variant="soft" onClick={() => setStep(2)}>
                                Back
                            </Button>
                            <Button onClick={() => setStep(4)}>
                                Next: Video Feeds
                            </Button>
                        </Flex>
                    </Flex>
                );

            case 4:
                return (
                    <Flex direction="column" gap="4">
                        <Heading size="6">Video Feed Configuration</Heading>

                        <Text size="3" color="gray">
                            Configure your live camera feeds (optional - you can add these later).
                        </Text>

                        <Separator size="4" />

                        <Flex direction="column" gap="3">
                            <Box>
                                <Text as="label" size="2" weight="bold" mb="1">
                                    Live Feed 1 (RTSP/HTTP URL)
                                </Text>
                                <TextField.Root
                                    size="3"
                                    placeholder="rtsp://camera1/stream or https://..."
                                    value={liveFeed1}
                                    onChange={(e) => setLiveFeed1(e.target.value)}
                                />
                            </Box>

                            <Box>
                                <Text as="label" size="2" weight="bold" mb="1">
                                    Live Feed 2 (RTSP/HTTP URL)
                                </Text>
                                <TextField.Root
                                    size="3"
                                    placeholder="rtsp://camera2/stream or https://..."
                                    value={liveFeed2}
                                    onChange={(e) => setLiveFeed2(e.target.value)}
                                />
                            </Box>

                            <Box>
                                <Text as="label" size="2" weight="bold" mb="1">
                                    Live Feed 3 (RTSP/HTTP URL)
                                </Text>
                                <TextField.Root
                                    size="3"
                                    placeholder="rtsp://camera3/stream or https://..."
                                    value={liveFeed3}
                                    onChange={(e) => setLiveFeed3(e.target.value)}
                                />
                            </Box>

                            <Separator size="4" />

                            <Callout.Root color="blue" mb="2">
                                <Callout.Icon>
                                    <InfoCircledIcon />
                                </Callout.Icon>
                                <Callout.Text>
                                    <strong>Alternative:</strong> If your AllSky or pier camera outputs to a file, you can monitor that file instead of using a stream.
                                </Callout.Text>
                            </Callout.Root>

                            <Flex align="center" gap="2" mb="2">
                                <Switch
                                    checked={useLocalCamera}
                                    onCheckedChange={setUseLocalCamera}
                                />
                                <Text size="2" weight="bold">
                                    Use local camera file monitoring
                                </Text>
                            </Flex>

                            {useLocalCamera && (
                                <Box>
                                    <Text as="label" size="2" weight="bold" mb="1">
                                        Local Camera File Path
                                    </Text>
                                    <TextField.Root
                                        size="3"
                                        placeholder="C:\AllSky\current.jpg"
                                        value={localCameraPath}
                                        onChange={(e) => setLocalCameraPath(e.target.value)}
                                    />
                                    <Text size="1" color="gray" mt="1">
                                        Path to the image file that updates continuously
                                    </Text>
                                </Box>
                            )}
                        </Flex>

                        <Flex gap="3" justify="between">
                            <Button variant="soft" onClick={() => setStep(3)}>
                                Back
                            </Button>
                            <Button onClick={() => setStep(5)}>
                                Next: Final Steps
                            </Button>
                        </Flex>
                    </Flex>
                );

            case 5:
                return (
                    <Flex direction="column" gap="4">
                        <Flex align="center" gap="2">
                            <CheckIcon width="24" height="24" />
                            <Heading size="6">You're All Set!</Heading>
                        </Flex>

                        <Text size="3" color="gray">
                            Your NINA Web Control Panel is configured and ready to use.
                        </Text>

                        <Separator size="4" />

                        <Card>
                            <Flex direction="column" gap="3">
                                <Heading size="4">Quick Tips</Heading>

                                <Flex direction="column" gap="2">
                                    <Flex gap="2" align="start">
                                        <Badge color="blue" style={{ marginTop: '2px' }}>1</Badge>
                                        <Text size="2">
                                            <strong>Update Settings:</strong> Click the settings icon (⚙️) in the top right to modify your configuration anytime.
                                        </Text>
                                    </Flex>

                                    <Flex gap="2" align="start">
                                        <Badge color="blue" style={{ marginTop: '2px' }}>2</Badge>
                                        <Text size="2">
                                            <strong>Customize Layout:</strong> Use the "Edit Layout" button to resize, reposition, or show/hide widgets.
                                        </Text>
                                    </Flex>

                                    <Flex gap="2" align="start">
                                        <Badge color="blue" style={{ marginTop: '2px' }}>3</Badge>
                                        <Text size="2">
                                            <strong>Widget Controls:</strong> Each widget has its own refresh and control options for real-time monitoring.
                                        </Text>
                                    </Flex>

                                    <Flex gap="2" align="start">
                                        <Badge color="blue" style={{ marginTop: '2px' }}>4</Badge>
                                        <Text size="2">
                                            <strong>Mobile Ready:</strong> Access your dashboard from any device - it's fully responsive!
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Card>

                        <Callout.Root color="green">
                            <Callout.Icon>
                                <CheckIcon />
                            </Callout.Icon>
                            <Callout.Text>
                                Configuration will be saved when you click "Start Using Dashboard" below.
                            </Callout.Text>
                        </Callout.Root>

                        <Flex gap="3" justify="between">
                            <Button variant="soft" onClick={() => setStep(4)}>
                                Back
                            </Button>
                            <Button size="3" onClick={saveConfiguration}>
                                Start Using Dashboard
                            </Button>
                        </Flex>
                    </Flex>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog.Root open={isOpen}>
            <Dialog.Content style={{ maxWidth: 600 }}>
                <Flex direction="column" gap="4">
                    <Flex justify="between" align="center">
                        <Flex gap="2" align="center">
                            <Text size="1" weight="bold" color="gray">
                                STEP {step} OF 5
                            </Text>
                        </Flex>
                        <Flex gap="1">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Box
                                    key={s}
                                    style={{
                                        width: '40px',
                                        height: '4px',
                                        backgroundColor: s <= step ? 'var(--accent-9)' : 'var(--gray-5)',
                                        borderRadius: '2px',
                                    }}
                                />
                            ))}
                        </Flex>
                    </Flex>

                    {renderStep()}
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default OnboardingFlow;
