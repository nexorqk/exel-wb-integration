import { ReactElement } from 'react';
import {
    Box,
    Button,
    Container,
    CssBaseline,
    Fade,
    Paper,
    Popper,
    Stack,
    Typography,
} from '@mui/material';
import PopupState, { bindPopper, bindToggle } from 'material-ui-popup-state';
import { OzonFields } from './components/ozon-fields';
import { YandexFields } from './components/yandex/yandex-fields';
import { WBFields } from './components/wb-fields';

export const App = (): ReactElement => (
    <Container component="main">
        <CssBaseline />
        <Box maxWidth={700}>
            <Typography
                className="animate-charcter"
                variant="h1"
                sx={{
                    fontWeight: 700,
                    fontSize: '3.5rem',
                    pt: 2,
                    mb: 3,
                }}
            >
                WB OZON Stickers
            </Typography>
            <PopupState variant="popper" popupId="demo-popup-popper">
                {popupState => (
                    <div>
                        <Button variant="contained" sx={{ mb: 2 }} {...bindToggle(popupState)}>
                            Инструкция
                        </Button>
                        <Popper {...bindPopper(popupState)} transition>
                            {({ TransitionProps }) => (
                                <Fade {...TransitionProps} timeout={350}>
                                    <Paper sx={{ color: '#dc143c', fontSize: 20, p: 4 }}>
                                        <ul style={{ listStyle: 'decimal' }}>
                                            <li>Загрузите Excel-файл</li>
                                            <li>
                                                Загрузите PDF-файл (выберите несколько через ctrl)
                                            </li>
                                            <li>Дождитесь загрузки</li>
                                            <li>Нажмите на кнопку Скачать</li>
                                        </ul>
                                    </Paper>
                                </Fade>
                            )}
                        </Popper>
                    </div>
                )}
            </PopupState>
            <Stack spacing={3}>
                <WBFields />
                <OzonFields />
                <YandexFields />
            </Stack>
        </Box>
    </Container>
);
